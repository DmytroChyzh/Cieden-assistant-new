## A2 Attempt Isolation Plan (Keyed Wrapper per Attempt) — P0-1 Fix

Date: 2025-11-01
Owner: Platform/Voice Stack
Scope: Voice first (P0), mirror for Text (follow-up)

### Context
- Bug P0-1: Missing attempt guards on voice `onDisconnect` (lines 631-663 in `src/providers/ElevenLabsProvider.tsx`).
- Impact: Stale disconnects from a previous WebRTC attempt can demote `retrying/connected` → `idle`, release the lock, and corrupt current session state.
- A1 (SDK-provided attempt/connection id) is not available in current `@elevenlabs/*` callbacks.

### Goal
Eliminate stale-event races without SDK changes by isolating each connection attempt in a separate component instance that owns the SDK hook.

### Approach (A2)
Create a minimal wrapper component around `useConversation` that is keyed by an `attemptId`. When a new attempt starts (including retries), we change the key so the old wrapper unmounts. Unmounted wrappers cannot emit callbacks, so stale events never reach the parent.

Key properties:
- Surgical: No functional removal, only structural isolation.
- Deterministic: Stale events cannot mutate current state.
- Reusable: Apply the same pattern to Text mode.

### Files & Ownership
- New: `src/providers/transports/VoiceTransport.tsx` (internal-only wrapper)
- Edit: `src/providers/ElevenLabsProvider.tsx` (mount wrapper keyed by `voiceAttemptId`, refactor start/stop to use wrapper ref)
- Later (follow-up): `src/providers/transports/TextTransport.tsx` and provider integration

### Design
1) VoiceTransport wrapper (owns `useConversation`)
- Forwards all SDK callbacks to the parent unchanged.
- Exposes a small imperative API via `forwardRef` so the parent can call `startSession`, `endSession`, `sendUserMessage`, etc.
- Signals mount readiness to parent (reliable timing, no `Promise.resolve()` hacks).
- Performs explicit cleanup (`endSession`) on unmount (idempotent, swallow errors).

Example (VoiceTransport):
```tsx
"use client";
import React, { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import { useConversation, type HookOptions, type Status } from "@elevenlabs/react";

export type VoiceTransportHandle = {
  startSession: (options: HookOptions) => Promise<string>;
  endSession: () => Promise<void>;
  sendUserMessage: (text: string) => void;
  sendContextualUpdate: (text: string) => void;
  setVolume: (v: { volume: number }) => void;
  getStatus: () => Status;
  getId: () => string | undefined;
};

type VoiceTransportProps = HookOptions & {
  attemptId: string;               // for logging/diagnostics
  onMountReady?: () => void;       // signal parent that ref is ready
  onStatusChange?: (arg: { status: Status }) => void;
  onDisconnect?: (details: any) => void;
  onMessage?: (ev: any) => void;
  onAudio?: (audio: string) => void;
  onError?: (err: unknown) => void;
  onAgentToolResponse?: (res: any) => void;
  onVadScore?: (arg: { vadScore: number }) => void;
  onDebug?: (info: any) => void;
};

export const VoiceTransport = forwardRef<VoiceTransportHandle, VoiceTransportProps>(
  function VoiceTransport(props, ref) {
    const { onMountReady, attemptId, ...convOptions } = props;
    const hasNotifiedReady = useRef(false);

    const conv = useConversation({
      ...convOptions,
      onStatusChange: convOptions.onStatusChange,
      onDisconnect: convOptions.onDisconnect,
      onMessage: convOptions.onMessage,
      onAudio: convOptions.onAudio,
      onError: convOptions.onError,
      onAgentToolResponse: convOptions.onAgentToolResponse,
      onVadScore: convOptions.onVadScore,
      onDebug: convOptions.onDebug
    });

    useImperativeHandle(ref, () => ({
      startSession: (options) => conv.startSession(options as any), // SessionConfig stays per-call
      endSession: () => conv.endSession(),
      sendUserMessage: (t) => conv.sendUserMessage(t),
      sendContextualUpdate: (t) => conv.sendContextualUpdate(t),
      setVolume: (v) => conv.setVolume(v),
      getStatus: () => conv.status,
      getId: () => conv.getId?.()
    }), [conv]);

    // Reliable mount-ready signal
    useEffect(() => {
      if (!hasNotifiedReady.current) {
        hasNotifiedReady.current = true;
        onMountReady?.();
      }
    }, [onMountReady]);

    // Explicit cleanup on unmount
    useEffect(() => {
      return () => {
        console.log(`[VoiceTransport] Unmount cleanup for attempt ${attemptId}`);
        conv.endSession().catch(() => {
          // Already closed or never started
        });
      };
    }, [conv, attemptId]);

    return null;
  }
);
```

2) Mount VoiceTransport keyed by `voiceAttemptId`
- In `ElevenLabsProvider`, add:
  - `voiceAttemptId` state (string | null)
  - `voiceRef` to call imperative methods.
- Render the wrapper when in voice mode, using `key={voiceAttemptId}` so each attempt remounts a fresh transport.

Example (Provider integration):
```tsx
// inside ElevenLabsProvider
const voiceRef = useRef<VoiceTransportHandle | null>(null);
const [voiceAttemptId, setVoiceAttemptId] = useState<string | null>(null);
const voiceMountReadyCallback = useRef<(() => void) | null>(null);

{voiceAttemptId && (
  <VoiceTransport
    key={voiceAttemptId}
    ref={voiceRef}
    attemptId={voiceAttemptId}
    onMountReady={() => voiceMountReadyCallback.current?.()}
    // pass hook-level options (clientTools, debug), not per-session config
    clientTools={elevenLabsClientTools}
    onStatusChange={handleVoiceStatus}
    onDisconnect={handleVoiceDisconnect}
    onMessage={handleVoiceMessage}
    onAudio={handleVoiceAudio}
    onError={handleVoiceError}
    onAgentToolResponse={handleVoiceAgentTool}
    onVadScore={handleVoiceVad}
    onDebug={handleVoiceDebug}
  />
)}
```

3) Refactor start/stop to use wrapper (no behavior change)
- `startVoice`:
  - Generate `attemptId = crypto.randomUUID()` and `setVoiceAttemptId(attemptId)`.
  - Create a `readyPromise`; have `onMountReady` resolve it; `await readyPromise` (reliable mount detection).
  - Then call `voiceRef.current!.startSession(SessionConfig)` with the same session-level options used today (`agentId`, `connectionType`, `conversationToken/signedUrl` if applicable, `overrides`, `dynamicVariables`).
  - Keep all existing logic: text fast-stop coordination, waiters, state updates, transcript stream creation, VAD, lock handling.
- `stopVoice`:
  - Call `voiceRef.current?.endSession()`; cleanup continues via existing parent handlers; wrapper unmount will also attempt idempotent cleanup.

Sketch (startVoice core):
```ts
const startVoice = useCallback(async () => {
  // existing: ensure text stopped, set sessionMode 'voice', reset refs/waiters
  const id = crypto.randomUUID();

  const readyPromise = new Promise<void>(resolve => {
    voiceMountReadyCallback.current = resolve;
  });

  setVoiceAttemptId(id); // mount wrapper with new key
  await readyPromise;    // wait for onMountReady

  const conversationId = await voiceRef.current!.startSession({
    agentId,
    connectionType: "webrtc",
    overrides: { agent: { firstMessage: /* as before */ } },
    dynamicVariables: /* as before */
  });

  // existing: waitForState(connected), store conversationId, start transcript stream, etc.
}, [/* existing deps */]);
```

### Validation Plan
Manual + runtime assertions:
- Voice retry:
  - Start attempt A, induce disconnect, start attempt B.
  - Old A’s delayed `onDisconnect` never reaches parent (wrapper unmounted).
  - B connects, then its legit disconnect cleans up.
- Mode switch voice→text and text→voice:
  - No stale demotions or lock release from prior attempt after the switch.
- Stop flows:
  - `stopVoice` and `stopText` still end sessions and perform the same cleanup.
- Cross-tab lock:
  - Lock only cleared on active attempt’s disconnect (verify logs/messages).
- Transcript stream:
  - Creation/completion occurs exactly as before on connect/disconnect.
- VAD + waiters:
  - Values reset and waiters resolve exactly once per real disconnect.
- Network inspector:
  - Verify WebRTC/WebSocket connections close on wrapper unmount (no orphaned transports).
- Memory profile:
  - Check for absence of leaked transport instances after repeated retries/switches.

### Risk & Regression Assessment
- We do not remove or change existing behavior; we isolate attempts so stale events cannot fire.
- All existing callbacks and side-effects remain in the provider; the wrapper just forwards them.
- The plan avoids timing heuristics and does not add latency.

Notes:
- Session-level config (e.g., `agentId`, `connectionType`, `conversationToken`/`signedUrl`, `overrides`, `dynamicVariables`) remains passed to `startSession` per attempt. Hook-level options (callbacks, tools, debug) are provided as wrapper props.
- Wrapper unmount performs explicit `endSession()`; errors are swallowed as cleanup is idempotent.

### Rollback Plan
- If any issue appears, revert to direct `useConversation` in `ElevenLabsProvider` and remove the wrapper component. No data or schema changes are introduced.

### Follow-up (Text Parity)
- Implement `TextTransport` with the same pattern.
- Remove the fragile text state-based guard—stale events won’t arrive once attempts are isolated.

### Decision
- Adopt A2 now for Voice (P0 fix). Mirror for Text next.



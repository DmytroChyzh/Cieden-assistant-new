# ElevenLabs Text/Voice Connection Refactor Plan

## Summary
- Problem: Text mode is slow/failing due to an SDK `useConversation` WebSocket session that never reaches `status = 'connected'`; voice mode connects then crashes (`onDebug` callback missing). Mixed transports caused duplicate/competing sessions and handler contention.
- Goal: Make text fast and reliable; make voice stable; ensure a single active transport at a time; keep ability to send text during voice (RTC).
- Strategy: Single‑active‑transport model — WebSocket for text mode, WebRTC for voice mode — with clean switching and per‑mode handlers.

## Key Files (current project)
- Provider: `src/providers/ElevenLabsProvider.tsx`
- Text input: `src/components/unified/UnifiedChatInput.tsx`
- Text hook: `src/components/unified/hooks/useTextInput.ts`
- Voice hook: `src/components/unified/hooks/useVoiceRecording.ts`
- WS client: `src/hooks/useElevenLabsWebSocket.ts`
- Message persistence: `src/hooks/useElevenLabsMessages.ts`
- API (signed URL): `app/api/elevenlabs/signed-url/route.ts`
- Page wrapper: `app/voice-chat/page.tsx`
- Context utils: `src/utils/agentContext.ts`

## Current Issues (observed)
- Text
  - `startSession({ signedUrl, connectionType: 'websocket' })` via SDK never reaches `status='connected'` → 8s timeout per send → fallback WS only then sends.
  - Provider restarts/times out on every message → perceived “constant reconnect”.
- Voice
  - After WebRTC connect, SDK throws `onDebug is not a function` → disconnect.
  - Duplicate transcript streams (Strict Mode double-invoke + racing guards).
- Both
  - A single mutable `setOnMessageHandler` causes handler contention across modes.
  - Running WS and WebRTC concurrently likely conflicts with agent limits.

## Design Principles
- Single active transport at any time (WS OR WebRTC). End current before starting the next.
- Text mode uses dedicated WS only; voice mode uses SDK/WebRTC only.
- During voice mode, text messages send over RTC (`conversation.sendUserMessage(...)`) so the agent replies with both voice and text.
- Normalize all inbound events to `{ source: 'ai'|'user', message: string }` and persist them into Convex.

## Implementation Plan (Phase 1 — Core Fixes)
1) Connection Manager (in provider)
- Add explicit ops (exported by provider): `startText()`, `stopText()`, `startVoice()`, `stopVoice()` each returning a readiness Promise that resolves only when the target transport is truly ready.
- Enforce switching order: stop current → await `disconnected` → start target → await `connected`.
- Remove provider attempts to start text via SDK; WS is the sole text transport in text mode.

2) Text Mode (WebSocket only)
- Maintain persistent WS while in text mode; no per‑message reconnects.
- Reconnect policy: exponential backoff; stop on auth/limit close codes; do not send custom protocol messages (no custom `pong`).
- Persist `agent_response` to Convex and render in UI; optimistic save user text.

3) Voice Mode (WebRTC only)
- Use `useConversation` with `connectionType: 'webrtc'` and add a no‑op `onDebug: () => {}` to prevent the SDK crash (observed error: `onDebug is not a function`).
- Gate readiness on `onStatusChange('connected')`; don’t rely on `onConnect` alone.
- Create transcript stream exactly once (ref‑guard to avoid Strict Mode duplicate).
- If `relay` policy hangs, allow `all` under a debug flag for testing.

4) Sending Text During Voice
- Route send based on mode:
  - Voice: `conversation.sendUserMessage(...)` (RTC) → agent replies in voice and text.
  - Text: WS `sendTextMessage(...)`.
- Persist user text in both modes; normalize + save agent text replies.

5) Handler Isolation
- Replace single `setOnMessageHandler` with per‑mode subscribers:
  - WS handler active only in text mode.
  - RTC handler active only in voice mode.
- On switch, unregister old handlers before registering the new ones.

6) Clean Switch Logic
- Text → Voice: close WS + unregister; start WebRTC; await connected; optionally send contextual update.
- Voice → Text: end WebRTC session + complete transcript; start WS; await open.

## Explicit Changes To Apply
- Provider (`src/providers/ElevenLabsProvider.tsx`)
  - Add `onDebug: () => {}` to `useConversation` options for voice sessions.
  - Remove/disable SDK `startSession` for text; do not rely on `useConversation` for WS.
  - Implement and export `startText/stopText/startVoice/stopVoice` with readiness promises and a transition lock.
  - Ensure only one transport active at a time; enforce stop-before-start on mode changes.
  - Isolate message handlers per mode; unregister on switch.
- Text hook (`src/components/unified/hooks/useTextInput.ts`)
  - Treat the dedicated WS hook as the primary and only transport in text mode.
  - Keep WS connected across messages; backoff reconnect on transient close codes; never reply to ping.
  - Persist `agent_response` to Convex so UI shows assistant replies.
- Voice hook (`src/components/unified/hooks/useVoiceRecording.ts`)
  - Use provider `startVoice/stopVoice` ops.
  - Guard transcript stream creation (ref) to avoid double streams in React Strict Mode.
  - Normalize + persist RTC events (user/agent) consistently.
- Unified input (`src/components/unified/UnifiedChatInput.tsx`)
  - Route send by mode: voice → RTC `sendUserMessage(...)`; text → WS `sendTextMessage(...)`.
  - Use provider ops for switching; avoid fixed sleeps/delays.
- API (`app/api/elevenlabs/signed-url/route.ts`)
  - Keep as-is; ensure clear error logs and 200 responses in dev.

## File-by-File Action Map
- `src/providers/ElevenLabsProvider.tsx`: onDebug noop; remove SDK text start; add connection manager ops; per‑mode handler isolation; enforce single transport.
- `src/components/unified/hooks/useTextInput.ts`: WS‑only transport for text; persist agent responses; stable connect/reconnect policy.
- `src/components/unified/hooks/useVoiceRecording.ts`: use ops; single transcript stream guard; persist RTC events.
- `src/components/unified/UnifiedChatInput.tsx`: route sends by mode; call provider ops on switch.
- `src/hooks/useElevenLabsWebSocket.ts`: ensure protocol compliance (no custom pong); backoff reconnect.
- `src/hooks/useElevenLabsMessages.ts`: unchanged, used for persistence.

## Implementation Plan (Phase 2 — Optional Optimization)
- Auto‑start WS on page load (behind flag `TEXT_WS_AUTOSTART`):
  - Connect WS on mount while idle (no cost until first message).
  - Close WS when switching to voice to maintain single active session.

## Events & Persistence
- Normalize inbound events from WS/RTC to a consistent `{ source, message }` shape.
- Persist to Convex with metadata:
  - WS assistant: `{ source: 'text', via: 'websocket' }`.
  - RTC: user transcripts and assistant replies with `{ via: 'webrtc' | 'voice' }`.

## Observability & Guardrails
- Log mode, action, transport, sessionId, and elapsed time for start/stop/switch.
- Clear user errors for: mic denied (voice), auth/limits (WS), timeouts.
- Feature flags:
  - `WS_ONLY_TEXT` — hard‑lock text to WS.
  - `TEXT_WS_AUTOSTART` — enable WS preconnect on load.
  - `VOICE_ICE_POLICY` — toggle ICE policy for debugging.

## Acceptance Criteria
- Text mode: first reply < 1–2s; no provider “awaiting connected” logs; WS remains connected without loops; unique messages in UI.
- Voice mode: connects < 3s; no `onDebug` crash; one transcript stream; text during voice is sent over RTC and agent replies with voice + text shown in chat.
- Switching: never concurrent WS + WebRTC; no handler contention; no reconnect spam.

## Risks & Mitigations
- SDK changes: keep WS‑only text behind a flag; revisit SDK text when stable.
- Dev double‑invoke: guard stream creation and handler registration.
- Network variance: configurable timeouts/backoff; log close codes/reasons.

## Next Session: Execution Order
1) Remove provider text session attempts; WS‑only for text; add no‑op `onDebug` for voice.
2) Implement Connection Manager switch ops and per‑mode handler isolation.
3) Validate acceptance criteria on local/dev.
4) Add optional WS autostart flag and measure latency improvement.

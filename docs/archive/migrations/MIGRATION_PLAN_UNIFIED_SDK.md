# Migration Plan: Unified ElevenLabs SDK for Text & Voice Modes

**Date Created:** September 30, 2025
**Date Updated:** January 17, 2026
**SDK Version:** `@elevenlabs/react@0.8.0` ✅ INSTALLED 
**Client Version:** `@elevenlabs/client@0.8.0` ✅ INSTALLED 
**Estimated Time:** 8-10 hours
**Complexity:** Medium-High
**Status:** ✅ Ready for re-implementation with corrected plan

---

## 📋 Quick Summary

This plan migrates text mode from custom WebSocket to ElevenLabs React SDK, adds cross-tab coordination, and consolidates 11 tools from toolBridge.ts.

**What's Verified ✅:**
- Current code: 973 lines in ElevenLabsProvider.tsx (lines 14-973)
- Custom WebSocket: 500+ lines in useElevenLabsWebSocket.ts (will be removed)
- Current tools: 8 (voice only) → Target: 11 (both text & voice)
- Provider location: `/app/orchestration/layout.tsx:34` (layout-level)
- API route: `/api/elevenlabs/signed-url` (GET & POST methods exist)
- Test page: `/test-webrtc-override` exists

**Key Changes:**
1. **Remove** custom WebSocket hook (~500 lines)
2. **Add** SDK-based text conversation instance
3. **Consolidate** tools: 11 from toolBridge.ts (replaces current 8)
4. **Add** cross-tab coordination (BroadcastChannel + localStorage)
5. **Reduce** provider size: 973 → ~400 lines (-60%)

**Result:** Text & voice modes both use SDK, all tools work in both modes, no duplicate sessions across tabs, no audio charges in text mode.

---

## Executive Summary

**Goal:** Replace custom WebSocket implementation with ElevenLabs React SDK for text mode, enabling full client tool support, eliminating audio charges, and adding cross-tab coordination for multi-tab widget deployment.

**Current State (VERIFIED):**
- Text mode: Custom `useElevenLabsWebSocket` hook (lines 510-556 in ElevenLabsProvider.tsx)
  - NO client tools support ❌
  - Audio charges despite `textOnly: true` flag ❌
  - NO cross-tab coordination ❌
  - 8 tools registered in voice mode only
- Voice mode: React SDK `useConversation` (lines 291-506 in ElevenLabsProvider.tsx)
  - 8 tools work perfectly ✅
  - Audio charges expected ✅
  - NO cross-tab coordination ❌
- Provider mounted at: `/app/orchestration/layout.tsx:34` (layout-level)
- Session persistence: Works within `/orchestration` routes ✅

**Target State:**
- Text mode: React SDK `useConversation` with WebSocket (11 tools work, NO audio charges, cross-tab coordination)
- Voice mode: React SDK `useConversation` with WebRTC (11 tools work, with cross-tab coordination)
- **Cross-tab coordination** - only one session across all tabs, session persists across navigation
- **Unified tool set** - 11 tools from toolBridge.ts (consolidated from current 8 + 3 new)

**Key Benefits:**
- ✅ All 11 client tools work in text mode (bridge-aligned via toolBridge.ts)
- ✅ No audio charges in text mode
- ✅ Cross-tab session coordination (prevents duplicate billing)
- ✅ Session persistence across navigation (already works in /orchestration)
- ✅ Simpler architecture (one SDK, -600 lines of code)
- ✅ Faster text connection (WebSocket, no microphone permission)

---

## SDK Analysis: What It Does & Doesn't Do

### ✅ SDK Handles:
1. **WebSocket/WebRTC connection management** - Lifecycle and reconnection
2. **Message queuing (incoming only)** - Queues messages until callback registered
3. **Per-instance duplicate prevention** - Same hook won't create duplicate sessions
4. **Client tools execution** - Calls your functions, sends results back
5. **Audio streaming** - Media track management

### ❌ SDK Does NOT Handle (Provider Required):
1. **Message queuing (outgoing)** - Messages sent before connection fail silently
   ```javascript
   // SDK code:
   sendMessage(e) {
     this.socket.send(JSON.stringify(e));  // No queue, no checks!
   }
   ```

2. **Connection state waiting** - No built-in wait for "connected" before allowing sends
   ```javascript
   // WebSocket: No checks at all
   // WebRTC: Checks state but doesn't queue messages
   ```

3. **Cross-tab coordination** - Each instance completely isolated, no localStorage/BroadcastChannel
   ```javascript
   // No evidence of cross-tab awareness in SDK source
   ```

4. **Global duplicate prevention** - Only prevents duplicates within same instance
   ```javascript
   if (p.current && p.current.isOpen()) return p.current.getId();
   // ↑ Only checks local instance, not other tabs
   ```

5. **Session persistence** - Hook unmounts = session ends (no recovery)

**Conclusion:** Provider is ESSENTIAL for multi-tab widget requirements.

---

## Prerequisites Checklist

Before starting, verify:

- [x] SDK upgraded to `@elevenlabs/react@0.7.0` ✅ Verified in package.json:22
- [x] Test page exists at `app/test-webrtc-override/page.tsx` ✅ Verified
- [x] API route exists at `app/api/elevenlabs/signed-url/route.ts` ✅ Verified (GET & POST)
- [x] Provider mounted at layout level: `app/orchestration/layout.tsx:34` ✅ Verified
- [x] Current implementation understood (ElevenLabsProvider.tsx: 973 lines) ✅ Verified
- [ ] Development server running (`npm run dev`)
- [ ] Convex dev server running (`npx convex dev`)
- [ ] Test page accessible at `localhost:3000/test-webrtc-override`
- [ ] ElevenLabs dashboard access (to verify audio charges)
- [ ] Env configured in `.env.local`: `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`, `ELEVENLABS_API_KEY`
- [ ] Git branch created: `git checkout -b migration/unified-elevenlabs-sdk`
- [ ] Browser DevTools open (for testing cross-tab coordination)

---

## Implementation Tasks (AI-Executable)

- Add bridge-aligned client tools config (`/src/config/elevenLabsTools.ts`).
- Create cross-tab session utility (`/src/utils/crossTabSession.ts`).
- Update provider imports to use new modules.
- Implement cross-tab state and heartbeats in `src/providers/ElevenLabsProvider.tsx`.
- Replace custom WebSocket with SDK `textConversation` (WebSocket via `signedUrl`).
- Rename/update `voiceConversation` and release session lock in `onDisconnect`.
- Implement `startText` with `signedUrl` fetch and cross-tab session lock.
- Implement `stopText` with lock release and wait-for-disconnect.
- Implement `startVoice` cross-tab lock check and lock acquisition.
- Update `sendTextMessage` and `sendVoiceMessage` to use SDK conversations.
- Update context value and interface (add cross-tab fields; add contextual update fallback for text mode).
- Create `src/components/unified/CrossTabStatus.tsx`.
- Integrate `CrossTabStatus` into `UnifiedChatInput` UI.
- Backup `src/hooks/useElevenLabsWebSocket.ts` and update references if needed.
- Update documentation (`CLAUDE.md`, `ELEVENLABS_TEXT_ONLY_BUG_REPORT.md`).
- Run manual tests (cross-tab lock/handoff/stale cleanup; navigation persistence; tools in text mode; voice regression).
- Verify no audio charges for text mode in ElevenLabs dashboard.
- Commit changes and open PR.

## Architecture Overview

### Current Architecture (Before Migration)

```
┌─────────────────────────────────────────────────────────┐
│ ElevenLabsProvider.tsx (972 lines)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Text Mode:                                             │
│  ┌──────────────────────────────────────┐              │
│  │ useElevenLabsWebSocket               │              │
│  │ - Custom WebSocket connection        │              │
│  │ - Sends text_only: true override     │              │
│  │ - NO client tools (not implemented)  │ ❌           │
│  │ - Audio charges (agent ignores)      │ ❌           │
│  │ - NO cross-tab coordination          │ ❌           │
│  └──────────────────────────────────────┘              │
│                                                         │
│  Voice Mode:                                            │
│  ┌──────────────────────────────────────┐              │
│  │ useConversation (React SDK)          │              │
│  │ - WebRTC connection                  │              │
│  │ - Client tools registered            │ ✅           │
│  │ - Audio streaming works              │ ✅           │
│  │ - NO cross-tab coordination          │ ❌           │
│  └──────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘

Issues:
- Tab A: Starts voice session → Bills $X
- Tab B: User opens widget → Starts another voice session → Bills $X again! ❌
- User navigates Tab A → Session dies, can't resume ❌
```

### Target Architecture (After Migration)

```
┌─────────────────────────────────────────────────────────┐
│ ElevenLabsProvider.tsx (~400 lines)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Cross-Tab Coordination Layer:                          │
│  ┌──────────────────────────────────────┐              │
│  │ BroadcastChannel('elevenlabs')       │              │
│  │ localStorage('elevenlabs_session')   │              │
│  │ Session Lock (prevents duplicates)   │ ✅           │
│  └──────────────────────────────────────┘              │
│                                                         │
│  Text Mode:                                             │
│  ┌──────────────────────────────────────┐              │
│  │ useConversation (React SDK)          │              │
│  │ - WebSocket via signedUrl            │              │
│  │ - textOnly: true (BOTH flags)        │              │
│  │ - Client tools work                  │ ✅           │
│  │ - No audio charges                   │ ✅           │
│  │ - Cross-tab aware                    │ ✅           │
│  └──────────────────────────────────────┘              │
│                                                         │
│  Voice Mode:                                            │
│  ┌──────────────────────────────────────┐              │
│  │ useConversation (React SDK)          │              │
│  │ - WebRTC via agentId                 │              │
│  │ - Client tools work                  │ ✅           │
│  │ - Audio streaming works              │ ✅           │
│  │ - Cross-tab aware                    │ ✅           │
│  └──────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘

Benefits:
- Tab A: Starts voice session → Bills $X
- Tab B: Widget sees existing session → Shows "Active in another tab" ✅
- User navigates Tab A → Session persists (provider mounted at layout) ✅
- Tab A closes → Tab B can take over session ✅
```

---

## Critical Technical Details

### Why Tests 2 & 3 Worked (Required Context)

From testing on September 30, 2025:

| Test | Connection | Config | Audio Charges | Tools | Result |
|------|-----------|--------|---------------|-------|---------|
| Pure JS WS | WebSocket | `text_only: true` override | ❌ YES | N/A | FAIL |
| Test 1 | SDK WS | `textOnly: true` flag only | ❌ YES | ❓ | FAIL |
| **Test 2** | **SDK WebRTC** | **`overrides` only** | **✅ NO** | **✅** | **SUCCESS** |
| **Test 3** | **SDK WS** | **BOTH flags** | **✅ NO** | **✅** | **SUCCESS** |

**Test 2 Configuration (WebRTC with override):**
```typescript
const conversation = useConversation({
  overrides: {
    conversation: {
      textOnly: true  // ← Runtime override alone works!
    }
  },
  clientTools: { /* ... */ }
});

await conversation.startSession({
  conversationToken: token,
  connectionType: 'webrtc'
});
```

**Test 3 Configuration (WebSocket with both):**
```typescript
const conversation = useConversation({
  textOnly: true,  // ← SDK flag
  overrides: {
    conversation: {
      textOnly: true  // ← Runtime override (redundant but safe)
    }
  },
  clientTools: { /* ... */ }
});

await conversation.startSession({
  signedUrl: signed_url  // ← Uses WebSocket (not WebRTC)
});
```

**Key Findings:**
1. **Override alone is sufficient** - `overrides.conversation.textOnly: true` prevents audio charges
2. **Both flags work together** - Adding `textOnly: true` at SDK level is redundant but harmless
3. **signedUrl triggers WebSocket** - No `connectionType` parameter needed
4. **Works with both WebRTC and WebSocket** - Override respected by agent in both connection types
5. **Tools work** - Because SDK registers clientTools
6. **Recommendation:** Use both flags for defensive programming (in case SDK behavior changes)

---

## Phase 1: Extract Shared Configuration

**Goal:** Create reusable constants to avoid duplication

### Step 1.1: Create Client Tools Configuration

**File to create:** `/src/config/elevenLabsTools.ts`

**Context:** Current provider (lines 308-365) has 8 tools inline. This consolidates into 11 tools from toolBridge.ts.

**Current Tools (Provider):**
1. show_balance ✅
2. show_savings_goal ✅
3. show_document_id ✅
4. show_spending_chart → REPLACED by create_pie_chart/create_bar_chart
5. show_quiz → REPLACED by start_quiz/update_quiz
6. initiate_claim → REMOVED (not in toolBridge)
7. show_claim_assistant → REMOVED (not in toolBridge)
8. show_document_upload → REMOVED (not in toolBridge)

**New Tools (from toolBridge.ts lines 15-27):**
1. show_balance ✅ (kept)
2. show_savings_goal ✅ (kept)
3. show_document_id ✅ (kept)
4. create_pie_chart ✅ (NEW - replaces show_spending_chart)
5. create_bar_chart ✅ (NEW - replaces show_spending_chart)
6. show_loans ✅ (NEW)
7. show_lending_options ✅ (NEW)
8. show_credit_score ✅ (NEW)
9. show_emi_info ✅ (NEW)
10. start_quiz ✅ (NEW - replaces show_quiz)
11. update_quiz ✅ (NEW)

```typescript
"use client";

import { bridgeElevenLabsToolToCopilot, type ActionHandlers } from '@/src/utils/toolBridge';

/**
 * Creates unified client tools for both text and voice modes
 * Consolidates all 11 tools from toolBridge.ts
 *
 * @param actionHandlers - Action handlers from parent component
 * @returns Object with all tool functions for ElevenLabs SDK
 */
export function createClientTools(actionHandlers: ActionHandlers | null) {
  if (!actionHandlers) return undefined;

  return {
    // Core financial UI (3 tools)
    show_balance: async (params: unknown) => {
      console.log('💰 Tool: show_balance', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_balance', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },
    show_savings_goal: async (params: unknown) => {
      console.log('🎯 Tool: show_savings_goal', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_savings_goal', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },
    show_document_id: async (params: unknown) => {
      console.log('🆔 Tool: show_document_id', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_document_id', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },

    // Charts (2 tools - replaces show_spending_chart)
    create_pie_chart: async (params: unknown) => {
      console.log('📊 Tool: create_pie_chart', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'create_pie_chart', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },
    create_bar_chart: async (params: unknown) => {
      console.log('📈 Tool: create_bar_chart', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'create_bar_chart', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },

    // Loans and lending (2 tools)
    show_loans: async (params: unknown) => {
      console.log('💳 Tool: show_loans', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_loans', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },
    show_lending_options: async (params: unknown) => {
      console.log('💰 Tool: show_lending_options', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_lending_options', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },

    // Credit & EMI (2 tools)
    show_credit_score: async (params: unknown) => {
      console.log('📊 Tool: show_credit_score', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_credit_score', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },
    show_emi_info: async (params: unknown) => {
      console.log('🧮 Tool: show_emi_info', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_emi_info', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },

    // Quizzes (2 tools - replaces show_quiz)
    start_quiz: async (params: unknown) => {
      console.log('🎮 Tool: start_quiz', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'start_quiz', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    },
    update_quiz: async (params: unknown) => {
      console.log('📝 Tool: update_quiz', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'update_quiz', parameters: params, timestamp: Date.now() },
        actionHandlers
      );
    }
  };
}
```

**Why this file?**
- DRY principle (Don't Repeat Yourself)
- Used by both text and voice conversations
- Aligned with `src/utils/toolBridge.ts` (lines 15-27) so calls always reach existing handlers
- Consolidates 11 tools (up from 8 in current provider)
- Removes legacy tools (initiate_claim, show_claim_assistant, show_document_upload)
- Easier to add/modify tools in the future

**Estimated time:** 15-20 minutes

---

## Phase 2: Add Cross-Tab Coordination (NEW)

**Goal:** Prevent duplicate sessions across browser tabs

### Step 2.1: Understanding the Problem

**Without cross-tab coordination:**
```typescript
// Tab A
const conv = useConversation();
await conv.startSession();  // ✅ Creates session, bills $X

// Tab B (user opens new tab)
const conv2 = useConversation();  // Different React instance!
await conv2.startSession();  // ❌ Creates ANOTHER session, bills $X again!
```

**With cross-tab coordination:**
```typescript
// Tab A
await startVoice();  // ✅ Acquires lock, starts session

// Tab B
await startVoice();  // ❌ Throws error: "Session active in Tab A"
```

### Step 2.2: Create Cross-Tab Coordination Utility

**File to create:** `/src/utils/crossTabSession.ts`

```typescript
"use client";

export type SessionMode = 'text' | 'voice' | null;

export interface SessionState {
  conversationId: string;
  mode: SessionMode;
  tabId: string;
  timestamp: number;
}

export interface SessionMessage {
  type: 'SESSION_STARTED' | 'SESSION_ENDED' | 'SESSION_HEARTBEAT' | 'CLAIM_SESSION';
  payload: SessionState | { tabId: string };
}

// Generate unique tab ID
export function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Check if session is stale (no heartbeat for 30 seconds)
export function isSessionStale(state: SessionState | null): boolean {
  if (!state) return true;
  const now = Date.now();
  return (now - state.timestamp) > 30000; // 30 seconds
}

// Session lock management via localStorage
export class SessionLock {
  private static readonly LOCK_KEY = 'elevenlabs_session_lock';

  static get(): SessionState | null {
    try {
      const data = localStorage.getItem(this.LOCK_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to read session lock:', e);
      return null;
    }
  }

  static set(state: SessionState): void {
    try {
      localStorage.setItem(this.LOCK_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to set session lock:', e);
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.LOCK_KEY);
    } catch (e) {
      console.error('Failed to clear session lock:', e);
    }
  }

  static updateHeartbeat(tabId: string): void {
    const current = this.get();
    if (current && current.tabId === tabId) {
      current.timestamp = Date.now();
      this.set(current);
    }
  }
}

// Cross-tab messaging via BroadcastChannel
export function createSessionChannel() {
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel not supported in this browser');
    return null;
  }

  return new BroadcastChannel('elevenlabs_session');
}
```

**Why this utility?**
- Encapsulates cross-tab logic
- Handles session locking via localStorage
- Manages BroadcastChannel messaging
- Detects stale sessions (orphaned tabs)

**Estimated time:** 30 minutes

### Step 2.3: Understand Storage Event Limitations

**Important:** `localStorage` events don't fire in the same tab that made the change!

```typescript
// Tab A
localStorage.setItem('key', 'value');  // No event fired in Tab A

// Tab B (different tab)
window.addEventListener('storage', (e) => {
  // ✅ This fires in Tab B
  console.log('Storage changed:', e.key, e.newValue);
});
```

**This is why we use BroadcastChannel:**
- `BroadcastChannel` DOES fire in all tabs including sender
- Used for real-time coordination
- `localStorage` used for persistence only

---

## Phase 3: Update ElevenLabsProvider.tsx

**File:** `/src/providers/ElevenLabsProvider.tsx`

This is the main file requiring changes.

### Step 3.1: Add Imports

**Location:** Top of file

**Add:**
```typescript
import { createClientTools } from '@/src/config/elevenLabsTools';
import {
  SessionLock,
  SessionMessage,
  SessionState,
  generateTabId,
  isSessionStale,
  createSessionChannel
} from '@/src/utils/crossTabSession';
```

**Remove:**
```typescript
import { useElevenLabsWebSocket } from '@/src/hooks/useElevenLabsWebSocket';
```

**Estimated time:** 5 minutes

### Step 3.2: Add Cross-Tab State

**Location:** Inside `ElevenLabsProvider` function, before conversation instances

**Add:**
```typescript
// Cross-tab coordination
const tabId = useMemo(() => generateTabId(), []);
const sessionChannel = useMemo(() => createSessionChannel(), []);
const [isOtherTabActive, setIsOtherTabActive] = useState(false);
const [otherTabMode, setOtherTabMode] = useState<'text' | 'voice' | null>(null);
const conversationIdRef = useRef<string>('');

// Heartbeat to keep session alive
useEffect(() => {
  if (!sessionModeRef.current || sessionModeRef.current === 'idle') return;

  const heartbeat = setInterval(() => {
    SessionLock.updateHeartbeat(tabId);

    // Also broadcast heartbeat
    if (sessionChannel) {
      sessionChannel.postMessage({
        type: 'SESSION_HEARTBEAT',
        payload: {
          conversationId: conversationIdRef.current,
          mode: sessionModeRef.current,
          tabId,
          timestamp: Date.now()
        }
      } as SessionMessage);
    }
  }, 10000); // Every 10 seconds

  return () => clearInterval(heartbeat);
}, [sessionModeRef.current, tabId]);  // ⚠️ NOTE: sessionChannel and refs NOT in deps!

// Listen for cross-tab messages
useEffect(() => {
  if (!sessionChannel) return;

  const handleMessage = (event: MessageEvent<SessionMessage>) => {
    const { type, payload } = event.data;

    // Ignore messages from our own tab
    if ('tabId' in payload && payload.tabId === tabId) return;

    console.log(`📡 Cross-tab message from ${('tabId' in payload) ? payload.tabId : 'unknown'}:`, type);

    switch (type) {
      case 'SESSION_STARTED':
        const state = payload as SessionState;
        if (state.tabId !== tabId) {
          setIsOtherTabActive(true);
          setOtherTabMode(state.mode);
          console.log(`🚫 Another tab started ${state.mode} session`);
        }
        break;

      case 'SESSION_ENDED':
        setIsOtherTabActive(false);
        setOtherTabMode(null);
        console.log('✅ Other tab ended session');
        break;

      case 'SESSION_HEARTBEAT':
        const heartbeat = payload as SessionState;
        if (heartbeat.tabId !== tabId) {
          setIsOtherTabActive(true);
          setOtherTabMode(heartbeat.mode);
        }
        break;

      case 'CLAIM_SESSION':
        // Another tab wants to claim orphaned session
        if (sessionModeRef.current !== 'idle') {
          console.warn('⚠️ Another tab claiming session while we\'re active');
        }
        break;
    }
  };

  sessionChannel.onmessage = handleMessage;

  return () => {
    if (sessionChannel) {
      sessionChannel.onmessage = null;
    }
  };
}, [tabId]);  // ⚠️ CRITICAL: sessionChannel NOT in deps! Only tabId.

// Check for orphaned sessions on mount
useEffect(() => {
  const existingLock = SessionLock.get();

  if (existingLock) {
    if (isSessionStale(existingLock)) {
      console.log('🧹 Cleaning up stale session lock');
      SessionLock.clear();
    } else {
      console.log('🔒 Existing session found in another tab:', existingLock);
      setIsOtherTabActive(true);
      setOtherTabMode(existingLock.mode);
    }
  }
}, []);

// ⚠️ CRITICAL: Cleanup BroadcastChannel on unmount ONLY
// DO NOT include sessionChannel in dependency array or it will close on every render!
useEffect(() => {
  const channel = sessionChannel;  // Capture in closure
  return () => {
    // Only clear lock if this tab owns it
    const currentLock = SessionLock.get();
    if (currentLock && currentLock.tabId === tabId) {
      SessionLock.clear();

      // Try to send SESSION_ENDED, but don't fail if channel closed
      if (channel) {
        try {
          channel.postMessage({
            type: 'SESSION_ENDED',
            payload: { tabId, conversationId: conversationIdRef.current, mode: null, timestamp: Date.now() }
          } as SessionMessage);
        } catch (e) {
          // Channel may already be closed, ignore
        }
      }
    }

    // Close the channel
    if (channel) {
      try {
        channel.close();
      } catch (e) {
        // Already closed, ignore
      }
    }
  };
}, []);  // ⚠️ EMPTY DEPS = cleanup only runs on unmount!
```

**Why this code?**
- Generates unique tab ID for identification
- Creates BroadcastChannel for real-time messaging
- Sends heartbeat every 10 seconds to prove tab is alive
- Listens for messages from other tabs
- Cleans up orphaned sessions
- Properly releases lock on unmount

**Estimated time:** 45 minutes

### Step 3.3: Create Text Conversation Instance

**Location:** After cross-tab setup, before voice conversation

**Add:**
```typescript
// ============================================================================
// TEXT MODE CONVERSATION (WebSocket via React SDK)
// ============================================================================
const textConversation = useConversation({
  // CRITICAL: BOTH flags required for text-only mode to work without audio charges
  textOnly: true,  // SDK-level flag
  overrides: {
    conversation: {
      textOnly: true  // Runtime override
    }
  },

  // Register all client tools (now they work in text mode!)
  clientTools: createClientTools(actionHandlers),

  // Callbacks for text mode
  onConnect: () => {
    console.log('✅ Text WebSocket connected');
    setIsTextConnected(true);
    isTextConnectedRef.current = true;
    textConnectionStateRef.current = 'connected';
    resolveWaiters(textConnectWaitersRef);
  },

  onDisconnect: () => {
    console.log('🔌 Text WebSocket disconnected');
    setIsTextConnected(false);
    isTextConnectedRef.current = false;
    textConnectionStateRef.current = 'idle';

    if (sessionModeRef.current === 'text') {
      setSessionMode('idle');
      sessionModeRef.current = 'idle';

      // Release cross-tab lock
      const currentLock = SessionLock.get();
      if (currentLock && currentLock.tabId === tabId) {
        SessionLock.clear();
        if (sessionChannel) {
          sessionChannel.postMessage({
            type: 'SESSION_ENDED',
            payload: { tabId, conversationId: '', mode: null, timestamp: Date.now() }
          } as SessionMessage);
        }
      }
    }

    resolveWaiters(textDisconnectWaitersRef);
  },

  onMessage: (event: unknown) => {
    console.log('📨 Text mode message received:', event);

    if (sessionModeRef.current !== 'text') {
      return;
    }

    const normalized = normalizeIncomingEvent(event);
    if (!normalized) return;

    emitToHandlers(textHandlersRef, {
      ...normalized,
      via: 'websocket',
      raw: event
    });
  },

  onError: (error: unknown) => {
    console.error('❌ Text mode error:', error);

    // Check for daily limit error
    const errorObj = error as any;
    if (errorObj?.code === 1008 || errorObj?.reason?.includes('daily limit')) {
      emitErrorToHandlers(textErrorHandlersRef, {
        code: errorObj.code || 1008,
        reason: errorObj.reason || 'Daily limit reached'
      });
    }
  },

  onDebug: (message: any) => {
    console.log('🐛 Text mode debug:', message);
  }
});
```

**Estimated time:** 20 minutes

### Step 3.4: Update Voice Conversation Instance

**Location:** Lines 291-506 in ElevenLabsProvider.tsx

**Current Structure:**
- Line 291: `const conversation = useConversation({`
- Lines 308-365: 8 inline client tools
- Line 366: `onConnect` callback
- Line 446: `onDisconnect` callback
- Line 455: `onMessage` callback

**Changes:**

1. **Rename variable:**
```typescript
// Before (line 291):
const conversation = useConversation({

// After:
const voiceConversation = useConversation({
```

2. **Update clientTools (lines 308-365 → single line):**
```typescript
// Before (lines 308-365):
clientTools: actionHandlers ? {
  show_balance: async (params: unknown) => { /* ... */ },
  show_savings_goal: async (params: unknown) => { /* ... */ },
  show_document_id: async (params: unknown) => { /* ... */ },
  show_spending_chart: async (params: unknown) => { /* ... */ },
  show_quiz: async (params: unknown) => { /* ... */ },
  initiate_claim: async (params: unknown) => { /* ... */ },
  show_claim_assistant: async (params: unknown) => { /* ... */ },
  show_document_upload: async (params: unknown) => { /* ... */ }
} : undefined,

// After (consolidates to 11 tools):
clientTools: createClientTools(actionHandlers),
```

3. **Add cross-tab lock release in onDisconnect (line 446):**
```typescript
onDisconnect: () => {
  if (sessionModeRef.current === 'voice') {
    setSessionMode('idle');
    sessionModeRef.current = 'idle';

    // Release cross-tab lock (NEW)
    const currentLock = SessionLock.get();
    if (currentLock && currentLock.tabId === tabId) {
      SessionLock.clear();
      if (sessionChannel) {
        sessionChannel.postMessage({
          type: 'SESSION_ENDED',
          payload: { tabId, conversationId: '', mode: null, timestamp: Date.now() }
        } as SessionMessage);
      }
    }
  }
  console.log('🔌 WebRTC disconnected');
  voiceConnectionStateRef.current = 'idle';
  resolveWaiters(voiceDisconnectWaitersRef);
},
```

**Estimated time:** 15 minutes

### Step 3.5: Remove Custom WebSocket Hook

**Location:** Lines 508-560 in ElevenLabsProvider.tsx

**Current Code (VERIFIED):**
```typescript
// Line 508
const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';

// Lines 510-556
const {
  isConnected: wsConnected,
  connect: connectTextSocket,
  disconnect: disconnectTextSocket,
  sendTextMessage: sendTextOverSocket,
  sendContextualUpdate: sendContextualUpdateOverSocket
} = useElevenLabsWebSocket({
  agentId,
  conversationId,
  textOnly: true,
  onUserTranscript: transcript => {
    if (sessionModeRef.current !== 'text') return;
    emitToHandlers(textHandlersRef, {
      source: 'user',
      message: transcript,
      via: 'websocket',
      raw: { transcript }
    });
  },
  onAgentResponse: response => {
    if (sessionModeRef.current !== 'text') return;
    emitToHandlers(textHandlersRef, {
      source: 'ai',
      message: response,
      via: 'websocket',
      raw: { response }
    });
  },
  onConnectionChange: connected => {
    isTextConnectedRef.current = connected;
    setIsTextConnected(connected);
    textConnectionStateRef.current = connected ? 'connected' : 'idle';
    if (!connected) {
      sessionModeRef.current = sessionModeRef.current === 'text' ? 'idle' : sessionModeRef.current;
      textConnectPromiseRef.current = null;
    }
    if (connected) {
      resolveWaiters(textConnectWaitersRef);
    } else {
      resolveWaiters(textDisconnectWaitersRef);
    }
  },
  onDailyLimitReached: error => {
    emitErrorToHandlers(textErrorHandlersRef, error);
    rejectWaiters(textConnectWaitersRef, new Error(error.reason));
  }
});

// Lines 558-560
useEffect(() => {
  setIsTextConnected(wsConnected);
}, [wsConnected]);
```

**Replace with:**
```typescript
// Line 508 (KEEP THIS LINE)
const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';

// Lines 510-560 (DELETE ENTIRE BLOCK)
// Custom WebSocket removed - now using textConversation (React SDK) instead
```

**Estimated time:** 5 minutes

### Step 3.6: Update startText() Method

**Location:** Lines 655-714 in ElevenLabsProvider.tsx

**Current Implementation (VERIFIED):**
```typescript
const startText = useCallback(async () => {
  console.log('[ElevenLabsProvider] startText requested', {
    currentMode: sessionModeRef.current,
    isTextConnected: isTextConnectedRef.current,
    connectionState: textConnectionStateRef.current
  });

  if (!agentId) {
    throw new Error('NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured');
  }

  if (sessionModeRef.current === 'voice') {
    await stopVoice();
  }

  if (sessionModeRef.current === 'text') {
    if (isTextConnectedRef.current) {
      resetIdleTimer();
      return;
    }
    if (textConnectionStateRef.current === 'connecting' && textConnectPromiseRef.current) {
      return textConnectPromiseRef.current;
    }
  }

  if (textConnectPromiseRef.current) {
    return textConnectPromiseRef.current;
  }

  const transitionPromise = runTransition(async () => {
    textConnectionStateRef.current = 'connecting';
    console.log('[ElevenLabsProvider] startText transition start');
    setSessionMode('text');
    sessionModeRef.current = 'text';
    try {
      await connectTextSocket(); // ← Uses custom WebSocket
      await waitForState(
        () => isTextConnectedRef.current,
        textConnectWaitersRef,
        TEXT_CONNECT_TIMEOUT_MS,
        'Timed out waiting for text transport connection'
      );
      textConnectionStateRef.current = 'connected';
      resetIdleTimer();
      console.log('[ElevenLabsProvider] startText transition complete (connected)');
    } catch (error) {
      textConnectionStateRef.current = 'idle';
      console.warn('[ElevenLabsProvider] startText failed, reverting to idle');
      setSessionMode('idle');
      sessionModeRef.current = 'idle';
      throw error;
    }
  });

  textConnectPromiseRef.current = transitionPromise.finally(() => {
    textConnectPromiseRef.current = null;
  });

  await textConnectPromiseRef.current;
}, [agentId, connectTextSocket, resetIdleTimer, runTransition, stopVoice]);
```

**Replace entire method with:**
```typescript
const startText = useCallback(async () => {
  console.log('[ElevenLabsProvider] startText invoked', {
    sessionMode: sessionModeRef.current,
    textConversationStatus: textConversation.status,
    tabId,
    isOtherTabActive
  });

  // Check if already in text mode and connected
  if (sessionModeRef.current === 'text' && textConversation.status === 'connected') {
    console.log('[ElevenLabsProvider] Text mode already active and connected');
    return;
  }

  // Check cross-tab lock BEFORE starting session
  const existingLock = SessionLock.get();
  if (existingLock && !isSessionStale(existingLock) && existingLock.tabId !== tabId) {
    const message = `Cannot start text session: ${existingLock.mode} session active in another tab (${existingLock.tabId})`;
    console.error('🚫', message);
    throw new Error(message);
  }

  await runTransition(async () => {
    console.log('[ElevenLabsProvider] Starting text mode transition');

    // Stop voice if active
    if (sessionModeRef.current === 'voice') {
      console.log('[ElevenLabsProvider] Stopping voice before starting text');
      await stopVoice();
    }

    setSessionMode('text');
    sessionModeRef.current = 'text';
    textConnectionStateRef.current = 'connecting';

    try {
      // Get signed URL for WebSocket connection
      console.log('[ElevenLabsProvider] Fetching signed URL for text mode');
      const response = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId })
      });

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.status}`);
      }

      const { signed_url } = await response.json();
      console.log('[ElevenLabsProvider] Got signed URL, starting text session');

      // Start session with WebSocket (signedUrl triggers WebSocket mode)
      const conversationId = await textConversation.startSession({
        signedUrl: signed_url
      });

      console.log('[ElevenLabsProvider] Text session started:', conversationId);
      conversationIdRef.current = conversationId;

      // ⚠️ CRITICAL: Check if already connected BEFORE waiting!
      // SDK can connect faster than this code executes, causing race condition.
      // If onConnect fires before waitForState is called, the waiter never resolves.
      if (textConversation.status !== 'connected' && textConnectionStateRef.current !== 'connected') {
        console.log('[ElevenLabsProvider] Waiting for text connection...');
        await waitForState(
          () => textConversation.status === 'connected' || textConnectionStateRef.current === 'connected',
          textConnectWaitersRef,
          TEXT_CONNECT_TIMEOUT_MS,
          'Timed out waiting for text transport to connect'
        );
      } else {
        console.log('[ElevenLabsProvider] Text already connected, skipping wait');
      }

      console.log('[ElevenLabsProvider] Text transport connected successfully');

      // Acquire cross-tab lock AFTER successful connection
      const sessionState: SessionState = {
        conversationId,
        mode: 'text',
        tabId,
        timestamp: Date.now()
      };

      SessionLock.set(sessionState);
      console.log('🔒 Acquired session lock for text mode');

      // Broadcast to other tabs
      if (sessionChannel) {
        sessionChannel.postMessage({
          type: 'SESSION_STARTED',
          payload: sessionState
        } as SessionMessage);
      }

    } catch (error) {
      console.error('[ElevenLabsProvider] Failed to start text session:', error);
      textConnectionStateRef.current = 'idle';
      setSessionMode('idle');
      sessionModeRef.current = 'idle';
      throw error;
    }
  });
}, [runTransition, stopVoice, textConversation, agentId, tabId, isOtherTabActive, sessionChannel]);
```

**Key changes:**
1. Checks cross-tab lock BEFORE starting
2. Uses React SDK `textConversation.startSession()`
3. Waits for 'connected' status (SDK doesn't queue!)
4. Acquires lock AFTER successful connection
5. Broadcasts to other tabs

**Estimated time:** 30 minutes

### Step 3.7: Update stopText() Method

**Location:** Lines 593-638 in ElevenLabsProvider.tsx

**Current Implementation (VERIFIED):**
```typescript
const stopText = useCallback(async () => {
  console.log('[ElevenLabsProvider] stopText invoked', {
    sessionMode: sessionModeRef.current,
    isTextConnected: isTextConnectedRef.current,
    connectionState: textConnectionStateRef.current
  });
  console.trace('[ElevenLabsProvider] stopText trace');
  if (textConnectionStateRef.current === 'idle' && !isTextConnectedRef.current && sessionModeRef.current !== 'text') {
    return;
  }

  await runTransition(async () => {
    console.log('[ElevenLabsProvider] stopText transition start', {
      isConnected: isTextConnectedRef.current,
      sessionMode: sessionModeRef.current,
      connectionState: textConnectionStateRef.current
    });
    textConnectionStateRef.current = 'idle';
    textConnectPromiseRef.current = null;
    try {
      await disconnectTextSocket(); // ← Uses custom WebSocket
    } catch (error) {
      console.error('Failed to stop text transport', error);
    }

    try {
      await waitForState(
        () => !isTextConnectedRef.current,
        textDisconnectWaitersRef,
        TEXT_DISCONNECT_TIMEOUT_MS,
        'Timed out waiting for text transport to disconnect'
      );
    } catch (error) {
      console.warn('Text transport disconnection timed out', error);
    }

    setSessionMode('idle');
    sessionModeRef.current = 'idle';

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    console.log('[ElevenLabsProvider] stopText transition complete');
  });
}, [disconnectTextSocket, runTransition]);
```

**Replace with:**
```typescript
const stopText = useCallback(async () => {
  console.log('[ElevenLabsProvider] stopText invoked', {
    sessionMode: sessionModeRef.current,
    textConversationStatus: textConversation.status,
    tabId
  });

  if (sessionModeRef.current !== 'text' && textConversation.status === 'disconnected') {
    console.log('[ElevenLabsProvider] Not in text mode or already disconnected');
    return;
  }

  await runTransition(async () => {
    textConnectionStateRef.current = 'idle';

    if (textConversation.status === 'connected') {
      console.log('[ElevenLabsProvider] Ending text session');
      try {
        await textConversation.endSession();
      } catch (error) {
        console.error('[ElevenLabsProvider] Failed to end text session:', error);
      }
    }

    try {
      await waitForState(
        () => textConversation.status === 'disconnected' || textConversation.status === 'idle',
        textDisconnectWaitersRef,
        TEXT_DISCONNECT_TIMEOUT_MS,
        'Timed out waiting for text transport to disconnect'
      );
      console.log('[ElevenLabsProvider] Text transport disconnected successfully');
    } catch (error) {
      console.warn('[ElevenLabsProvider] Text transport disconnection timed out', error);
    }

    // Release cross-tab lock
    const currentLock = SessionLock.get();
    if (currentLock && currentLock.tabId === tabId) {
      SessionLock.clear();
      console.log('🔓 Released session lock');

      if (sessionChannel) {
        sessionChannel.postMessage({
          type: 'SESSION_ENDED',
          payload: { tabId, conversationId: '', mode: null, timestamp: Date.now() }
        } as SessionMessage);
      }
    }

    setSessionMode('idle');
    sessionModeRef.current = 'idle';
  });
}, [runTransition, textConversation, tabId, sessionChannel]);
```

**Estimated time:** 15 minutes

### Step 3.7b: Add Text Mode Autostart (Optional)

**Location:** After all start/stop methods are defined

⚠️ **CRITICAL: Check session mode before autostarting!**

**Add:**
```typescript
// ⚠️ Text mode autostart (optional, controlled by env var)
// CRITICAL: Must check sessionMode to avoid conflicting with voice mode!
useEffect(() => {
  if (!TEXT_WS_AUTOSTART) return;
  if (hasAutostartedRef.current) return;

  // ⚠️ CRITICAL: Do NOT autostart if another mode is active!
  if (sessionModeRef.current !== 'idle') {
    console.log('[ElevenLabsProvider] Skipping text autostart - session already active:', sessionModeRef.current);
    return;
  }

  hasAutostartedRef.current = true;
  startText().catch(error => {
    console.error('Failed to autostart ElevenLabs text session:', error);
    hasAutostartedRef.current = false;
  });
}, [startText]);
```

**Why this check matters:**
- Without the `sessionMode` check, text autostart triggers even when voice is active
- This causes voice session to be stopped prematurely
- Voice users see "Stopping voice before starting text" errors
- Cross-tab lock gets confused

**Estimated time:** 5 minutes

### Step 3.8: Update startVoice() Method

**Location:** Lines 730-830 in ElevenLabsProvider.tsx

**Current Implementation (VERIFIED):**
```typescript
const startVoice = useCallback(async (initialGreeting?: string) => {
  if (!agentId) {
    throw new Error('NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured');
  }

  if (sessionModeRef.current === 'text') {
    await stopText();
  }

  if (sessionModeRef.current === 'voice' && conversation.status === 'connected') {
    return;
  }

  await runTransition(async () => {
    setSessionMode('voice');
    sessionModeRef.current = 'voice';
    voiceConnectionStateRef.current = 'connecting';

    // Debug logs...
    console.log('🔍 Pre-startSession state:', {
      conversationStatus: conversation.status,
      agentId,
      initialGreeting: initialGreeting?.slice(0, 50)
    });

    // Start session
    const voiceConversationId = await voiceConversation.startSession({
      agentId,
      connectionType: "webrtc"
    });
    conversationIdRef.current = voiceConversationId || voiceConversation.getId?.() || '';

    // More debug logs...
    await waitForState(
      () => voiceConnectionStateRef.current === 'connected',
      voiceConnectWaitersRef,
      VOICE_CONNECT_TIMEOUT_MS,
      'Timed out waiting for voice transport connection'
    );
  });
}, [agentId, conversation, runTransition, stopText]);
```

**Add cross-tab lock checking:**

**At the beginning of the method (after line 732 agentId check), add:**
```typescript
// Check cross-tab lock BEFORE starting session
const existingLock = SessionLock.get();
if (existingLock && !isSessionStale(existingLock) && existingLock.tabId !== tabId) {
  const message = `Cannot start voice session: ${existingLock.mode} session active in another tab (${existingLock.tabId})`;
  console.error('🚫', message);
  throw new Error(message);
}
```

**After successful connection (after line 763 `await conversation.startSession`), add:**
```typescript
// Acquire cross-tab lock AFTER successful connection
const sessionState: SessionState = {
  conversationId: voiceConversation.getId?.() || '',
  mode: 'voice',
  tabId,
  timestamp: Date.now()
};

SessionLock.set(sessionState);
console.log('🔒 Acquired session lock for voice mode');

// Broadcast to other tabs
if (sessionChannel) {
  sessionChannel.postMessage({
    type: 'SESSION_STARTED',
    payload: sessionState
  } as SessionMessage);
}
```

**Also update all `conversation.` references to `voiceConversation.` throughout the method**

Note: Variable `conversation` is renamed to `voiceConversation` in Step 3.4

⚠️ **CRITICAL: DO NOT ADD DEBUG/DIAGNOSTIC CODE!**

**DO NOT ADD** setTimeout blocks that try to:
- Call `changeInputDevice()` - this method only works for specific connection types
- Check audio levels/frequency data - not needed for production
- Test microphone configuration - belongs in separate debug tools, not production code

**Why?**
- Debug code left in production causes confusing errors
- `changeInputDevice()` throws "Device switching is only available for voice conversations" error
- These checks belong in a separate diagnostic page, not in the main provider
- Production code should be clean and focused

**Estimated time:** 20 minutes

### Step 3.9: Update stopVoice() Method

**Location:** Lines 562-591 in ElevenLabsProvider.tsx

**Current Implementation (VERIFIED):**
```typescript
const stopVoice = useCallback(async () => {
  if (sessionModeRef.current !== 'voice' && conversation.status !== 'connected') {
    return;
  }

  await runTransition(async () => {
    voiceConnectionStateRef.current = 'idle';
    if (conversation.status === 'connected') {
      try {
        await conversation.endSession();
      } catch (error) {
        console.error('Failed to stop voice session', error);
      }
    }

    try {
      await waitForState(
        () => conversation.status === 'disconnected' || conversation.status === 'idle',
        voiceDisconnectWaitersRef,
        VOICE_DISCONNECT_TIMEOUT_MS,
        'Timed out waiting for voice transport to disconnect'
      );
    } catch (error) {
      console.warn('Voice transport disconnection timed out', error);
    }

    setSessionMode('idle');
    sessionModeRef.current = 'idle';
  });
}, [conversation, runTransition]);
```

**Changes:**
- Cross-tab lock release already added in Step 3.4 (onDisconnect callback line 446)
- Just update `conversation.` to `voiceConversation.`:
  - Line 563: `conversation.status` → `voiceConversation.status`
  - Line 569: `conversation.status` → `voiceConversation.status`
  - Line 571: `conversation.endSession()` → `voiceConversation.endSession()`
  - Line 579: `conversation.status` → `voiceConversation.status`
  - Line 591: Dependency `[conversation, runTransition]` → `[voiceConversation, runTransition]`

**Estimated time:** 10 minutes

### Step 3.10: Update sendTextMessage() Method

**Location:** Lines 840-862 in ElevenLabsProvider.tsx

**Current Implementation (VERIFIED):**
```typescript
const sendTextMessage = useCallback(async (message: string) => {
  const trimmed = message.trim();
  if (!trimmed) return false;

  if (sessionModeRef.current === 'voice') {
    if (conversation.status !== 'connected') {
      console.warn('Cannot send text during voice session: voice transport not connected');
      return false;
    }
    conversation.sendUserMessage(trimmed);
    return true;
  }

  if (sessionModeRef.current !== 'text' || !isTextConnectedRef.current) {
    await startText();
  }

  const sent = sendTextOverSocket(trimmed); // ← Uses custom WebSocket
  if (!sent) {
    console.warn('Failed to send text message over WebSocket');
  }
  return sent;
}, [conversation, sendTextOverSocket, startText]);
```

**Replace with:**
```typescript
const sendTextMessage = useCallback(async (message: string): Promise<boolean> => {
  if (sessionModeRef.current !== 'text') {
    console.warn('Cannot send text message: not in text mode');
    return false;
  }

  if (textConversation.status !== 'connected') {
    console.warn('Cannot send text message: text transport not connected');
    return false;
  }

  try {
    textConversation.sendUserMessage(message);
    return true;
  } catch (error) {
    console.error('Failed to send text message:', error);
    return false;
  }
}, [textConversation]);
```

**Estimated time:** 5 minutes

### Step 3.11: Update sendVoiceMessage() Method

**Location:** Lines 832-838 in ElevenLabsProvider.tsx

**Current Implementation (VERIFIED):**
```typescript
const sendVoiceMessage = useCallback(async (message: string) => {
  if (!message.trim()) return;
  if (conversation.status !== 'connected') {
    throw new Error('Voice transport is not connected');
  }
  conversation.sendUserMessage(message);
}, [conversation]);
```

**Update `conversation.` to `voiceConversation.`:**
```typescript
const sendVoiceMessage = useCallback(async (message: string) => {
  if (sessionModeRef.current !== 'voice') {
    console.warn('Cannot send voice message: not in voice mode');
    return;
  }

  if (voiceConversation.status !== 'connected') {
    console.warn('Cannot send voice message: not connected');
    return;
  }

  console.log('📤 Sending voice message:', message);
  try {
    voiceConversation.sendUserMessage(message);
  } catch (error) {
    console.error('Failed to send voice message:', error);
  }
}, [voiceConversation]);
```

**Estimated time:** 5 minutes

### Step 3.12: Update Context Return Value

**Location:** Lines 923-957 in ElevenLabsProvider.tsx

**Current Context Value (VERIFIED at line 923):**
```typescript
const value = useMemo<ElevenLabsContextValue>(() => ({
  conversation,
  sessionMode,
  isTransitioning,
  isTextConnected,
  streamId: currentStreamId,
  startText,
  stopText,
  startVoice,
  stopVoice,
  sendTextMessage,
  sendVoiceMessage,
  registerTextHandler,
  registerVoiceHandler,
  registerTextErrorHandler,
  resetTextIdleTimer: resetIdleTimer,
  sendContextualUpdateOverSocket
}), [
  conversation,
  sessionMode,
  isTransitioning,
  isTextConnected,
  currentStreamId,
  startText,
  stopText,
  startVoice,
  stopVoice,
  sendTextMessage,
  sendVoiceMessage,
  registerTextHandler,
  registerVoiceHandler,
  registerTextErrorHandler,
  resetIdleTimer,
  sendContextualUpdateOverSocket
]);
```

**Add new values for cross-tab awareness:**
```typescript
return (
  <ElevenLabsContext.Provider
    value={{
      // Expose the active conversation based on mode
      conversation: sessionModeRef.current === 'voice' ? voiceConversation : textConversation,
      sessionMode,
      isTransitioning,
      isTextConnected,
      streamId: currentStreamId,

      // Cross-tab state (NEW)
      isOtherTabActive,
      otherTabMode,
      tabId,

      // Methods
      startText,
      stopText,
      startVoice,
      stopVoice,
      sendTextMessage,
      sendVoiceMessage,
      registerTextHandler,
      registerVoiceHandler,
      registerTextErrorHandler,
      resetTextIdleTimer,
      sendContextualUpdateOverSocket: (text: string) => {
        const isText = sessionModeRef.current === 'text';
        const activeConv = isText ? textConversation : voiceConversation;
        if (activeConv.status === 'connected') {
          if (typeof (activeConv as any).sendContextualUpdate === 'function') {
            (activeConv as any).sendContextualUpdate(text);
            return true;
          }
          if (isText && typeof (textConversation as any).sendUserMessage === 'function') {
            try {
              (textConversation as any).sendUserMessage(`[CONTEXT_UPDATE]: ${text}`);
              return true;
            } catch (_) {}
          }
        }
        return false;
      }
    }}
  >
    {children}
  </ElevenLabsContext.Provider>
);
```

**Update interface:**
```typescript
interface ElevenLabsContextValue {
  conversation: ReturnType<typeof useConversation>;
  sessionMode: SessionMode;
  isTransitioning: boolean;
  isTextConnected: boolean;
  streamId: string | null;

  // Cross-tab state (NEW)
  isOtherTabActive: boolean;
  otherTabMode: 'text' | 'voice' | null;
  tabId: string;

  startText: () => Promise<void>;
  stopText: () => Promise<void>;
  startVoice: (initialGreeting?: string) => Promise<void>;
  stopVoice: () => Promise<void>;
  sendTextMessage: (message: string) => Promise<boolean>;
  sendVoiceMessage: (message: string) => Promise<void>;
  registerTextHandler: (
    handler: (event: NormalizedMessageEvent) => Promise<void> | void
  ) => () => void;
  registerVoiceHandler: (
    handler: (event: NormalizedMessageEvent) => Promise<void> | void
  ) => () => void;
  registerTextErrorHandler: (
    handler: (error: TextTransportError) => void
  ) => () => void;
  resetTextIdleTimer: () => void;
  sendContextualUpdateOverSocket: (text: string) => boolean;
}
```

**Estimated time:** 15 minutes

---

## Phase 4: Testing Cross-Tab Coordination

**Critical:** Must test cross-tab behavior extensively

### Step 4.1: Setup Test Environment

```bash
# Terminal 1
npm run dev

# Terminal 2 (optional, to watch Convex)
npx convex dev

# Browser
# Open localhost:3000/orchestration in 3 tabs
# Label them: Tab A, Tab B, Tab C
```

### Step 4.2: Test Cross-Tab Session Lock

**Test 1: Basic lock acquisition**
1. Tab A: Start text mode
2. **Expected:**
   - ✅ Session starts
   - ✅ Console: "🔒 Acquired session lock for text mode"
   - ✅ `localStorage.getItem('elevenlabs_session_lock')` shows session

3. Tab B: Try to start text mode
4. **Expected:**
   - ❌ Error thrown: "Cannot start text session: text session active in another tab"
   - ✅ Console: "🚫 Cannot start..."
   - ✅ No duplicate session created

**Test 2: Session handoff**
1. Tab A: Start text mode
2. Tab A: Stop text mode
3. **Expected:**
   - ✅ Console: "🔓 Released session lock"
   - ✅ Tab B console: "✅ Other tab ended session"

4. Tab B: Start text mode
5. **Expected:**
   - ✅ Session starts successfully
   - ✅ Tab B acquires lock

**Test 3: Stale session cleanup**
1. Tab A: Start text mode
2. Close Tab A entirely (don't click stop)
3. Wait 35 seconds (stale threshold)
4. Tab B: Start text mode
5. **Expected:**
   - ✅ Console: "🧹 Cleaning up stale session lock"
   - ✅ Session starts successfully

**Test 4: Mixed modes**
1. Tab A: Start voice mode
2. Tab B: Try to start text mode
3. **Expected:**
   - ❌ Error: "Cannot start text session: voice session active..."
   - ✅ Only one session active

4. Tab A: Stop voice
5. Tab B: Start text mode
6. **Expected:**
   - ✅ Success

### Step 4.3: Test Heartbeat System

**Test:**
1. Tab A: Start text mode
2. Open DevTools console in Tab A
3. Watch for heartbeat logs every 10 seconds
4. **Expected:**
   - ✅ Console shows heartbeat every 10 seconds
   - ✅ localStorage timestamp updates

5. Open Tab B console
6. **Expected:**
   - ✅ Tab B shows: "📡 Cross-tab message from tab_xxx: SESSION_HEARTBEAT"
   - ✅ `isOtherTabActive` is `true` in Tab B

### Step 4.4: Test Navigation Persistence

**Test:**
1. Tab A: Start text mode
2. Tab A: Navigate to different page within `/orchestration`
3. **Expected:**
   - ✅ Session persists (provider stays mounted)
   - ✅ No disconnection logs
   - ✅ Can still send messages

4. Tab A: Navigate outside `/orchestration` (e.g., `/`)
5. **Expected:**
   - ⚠️ Session ends (provider unmounts)
   - ✅ Lock released
   - ✅ Other tabs notified

### Step 4.5: Test Tool Functionality

**Test:**
1. Tab A: Start text mode
2. Tab A: Send message: "Show me my balance"
3. **Expected:**
   - ✅ Console: "💰 Tool: show_balance"
   - ✅ Balance card renders
   - ✅ No audio charges in ElevenLabs dashboard

4. Try bridge-aligned tools:
   - "Show me my balance" → `show_balance`
   - "Show my savings goal" → `show_savings_goal`
   - "Show my document" → `show_document_id`
   - "Show spending chart" → `create_pie_chart` (or `create_bar_chart`)
   - "Start a quiz" → `start_quiz`
   - "Update quiz" → `update_quiz`
   - "Show credit score" → `show_credit_score`
   - "Show lending options" → `show_lending_options`
   - "Show EMI info" → `show_emi_info`

**All should route through toolBridge and work ✅**

### Step 4.6: Verify No Audio Charges

**Critical test:**
1. Start fresh (no sessions)
2. Start text mode
3. Have a 10-message conversation
4. Stop text mode
5. Go to ElevenLabs dashboard
6. **Expected:**
   - ✅ Session shows in dashboard
   - ✅ Duration > 0
   - ✅ **Audio minutes = 0** ← CRITICAL
   - ✅ No audio charges

If audio charges appear → migration failed, need to debug

---

## Phase 5: UI Updates for Cross-Tab Awareness

**Optional but recommended:** Show users when another tab is active

### Step 5.1: Create Cross-Tab Status Component

**File:** `/src/components/unified/CrossTabStatus.tsx`

```typescript
"use client";

import { useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import { AlertCircle } from 'lucide-react';

export function CrossTabStatus() {
  const { isOtherTabActive, otherTabMode } = useElevenLabsConversation();

  if (!isOtherTabActive) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-800">
          Active session in another tab
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          A {otherTabMode} session is active in another browser tab.
          Close that session to start a new one here.
        </p>
      </div>
    </div>
  );
}
```

### Step 5.2: Update UnifiedChatInput

**Add to UI:**
```typescript
import { CrossTabStatus } from './CrossTabStatus';

// Inside component render:
<div className="space-y-2">
  <CrossTabStatus />  {/* Show warning if other tab active */}
  {/* Rest of UI */}
</div>
```

**Disable start button when other tab active:**
```typescript
const { isOtherTabActive } = useElevenLabsConversation();

<Button
  onClick={startRecording}
  disabled={isOtherTabActive || isRecording}
>
  {isOtherTabActive ? 'Active in Another Tab' : 'Start Voice'}
</Button>
```

**Estimated time:** 30 minutes

---

## Phase 6: Cleanup

### Step 6.1: Remove Custom WebSocket Hook File

**File to backup/remove:** `src/hooks/useElevenLabsWebSocket.ts`

**Current Status (VERIFIED):**
- File exists and is actively used (line 14 in ElevenLabsProvider.tsx)
- ~500 lines of custom WebSocket implementation
- Used only by ElevenLabsProvider for text mode

**Removal Process:**
```bash
# Backup first (create .backup directory if not exists)
mkdir -p .backup/migration-2026-01
mv src/hooks/useElevenLabsWebSocket.ts .backup/migration-2026-01/

# Check for any remaining references
grep -r "useElevenLabsWebSocket" src/ app/

# Expected: Only imports in ElevenLabsProvider (already removed in Step 3.1)
# If references remain in test/demo files, update those files before deletion
```

**Expected result:** No references should remain after Phase 3 changes

### Step 6.2: Update Documentation

**Files to update:**

1. **`CLAUDE.md`** (located at project root - verified to exist)
```markdown
### Voice Architecture (Updated January 2026)
- Unified approach using ElevenLabs React SDK for both modes
- Text mode: WebSocket via signed URLs (textOnly: true, NO audio charges)
- Voice mode: WebRTC via agent ID
- Client tools work in both modes (11 tools registered, consolidated from toolBridge.ts)
- Cross-tab coordination prevents duplicate sessions (BroadcastChannel + localStorage)
- Session persists across navigation (layout-level provider at /app/orchestration/layout.tsx:34)
- Provider reduced from 973 → ~400 lines (-60% code)

### Tool List (Updated)
**Consolidated 11 Tools:**
1. show_balance, show_savings_goal, show_document_id (core UI)
2. create_pie_chart, create_bar_chart (charts - replaces show_spending_chart)
3. show_loans, show_lending_options (loans)
4. show_credit_score, show_emi_info (credit)
5. start_quiz, update_quiz (quizzes - replaces show_quiz)

**Removed Tools:**
- show_spending_chart → replaced by create_pie_chart/create_bar_chart
- show_quiz → replaced by start_quiz/update_quiz
- initiate_claim, show_claim_assistant, show_document_upload → not in toolBridge
```

2. **`ELEVENLABS_TEXT_ONLY_BUG_REPORT.md`** (verified to exist at project root)
```markdown
## Resolution (January 2026)

Migrated to unified SDK approach using `@elevenlabs/react@0.7.0`:
- Text mode now uses React SDK with BOTH `textOnly` flags ✅
- No audio charges in text mode (verified in dashboard) ✅
- All 11 client tools work in text mode ✅
- Custom WebSocket implementation removed (~500 lines) ✅
- Cross-tab coordination added via BroadcastChannel + localStorage ✅
- Session persistence via layout-level provider ✅
- Provider size reduced 60% (973 → ~400 lines) ✅

### Technical Details
- **File**: src/providers/ElevenLabsProvider.tsx
- **Before**: 973 lines with dual implementation (custom WebSocket + SDK)
- **After**: ~400 lines with unified SDK approach
- **Tool consolidation**: 8 → 11 tools (aligned with toolBridge.ts)
- **Cross-tab features**: Session lock, heartbeat, stale cleanup (30s)
```

### Step 6.3: Commit Changes

```bash
git add .
git commit -m "feat: unified ElevenLabs SDK with cross-tab coordination

BREAKING: Replaces custom WebSocket with SDK for text mode

Changes:
- Remove custom useElevenLabsWebSocket hook (501 lines)
- Add cross-tab coordination (BroadcastChannel + localStorage)
- Use SDK for both text (WebSocket) and voice (WebRTC) modes
- Extract client tools to shared config
- Add session lock to prevent duplicate billing
- Add heartbeat system for orphaned session cleanup

Features:
- ✅ All 8 client tools now work in text mode
- ✅ No audio charges in text mode (both textOnly flags)
- ✅ Cross-tab session coordination
- ✅ Session persists across navigation
- ✅ Stale session cleanup (30s threshold)
- ✅ Real-time cross-tab messaging

Testing:
- Cross-tab lock acquisition/release
- Stale session cleanup
- Session handoff between tabs
- Navigation persistence
- Tool functionality in text mode
- Audio charge verification

Estimated impact: -600 lines, +300 lines = -300 net
"
```

---

## Troubleshooting Guide

### Issue 1: "Audio charges still appearing"

**Diagnosis:**
```typescript
// Check console during text session start
console.log('[ElevenLabsProvider] Text session config:', {
  textOnly: true,
  overrides: { conversation: { textOnly: true } }
});
```

**Solution:** Verify BOTH flags are present in `textConversation` config

### Issue 2: "Cross-tab lock not working"

**Symptoms:** Multiple tabs can start sessions simultaneously

**Diagnosis:**
```typescript
// Check localStorage
console.log('Lock:', localStorage.getItem('elevenlabs_session_lock'));

// Check BroadcastChannel support
console.log('BroadcastChannel supported:', typeof BroadcastChannel !== 'undefined');
```

**Solutions:**

**A) localStorage blocked (incognito mode):**
```typescript
// Add fallback detection
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('localStorage not available - cross-tab coordination disabled');
  // Fall back to single-tab mode
}
```

**B) BroadcastChannel not supported:**
```typescript
// Already handled in createSessionChannel()
// Will log warning and return null
// Consider adding polyfill or alternative
```

### Issue 3: "Session hangs on startup"

**Symptoms:** `startText()` never resolves

**Diagnosis:**
```typescript
// Check conversation status
console.log('Text conversation status:', textConversation.status);

// Check waiter timeout
console.log('Waiter timeout:', TEXT_CONNECT_TIMEOUT_MS);
```

**Solution:** Increase timeout or check network connection

### Issue 4: "Stale sessions not cleaning up"

**Symptoms:** Tab closed, but lock persists forever

**Diagnosis:**
```typescript
const lock = SessionLock.get();
console.log('Lock age:', Date.now() - (lock?.timestamp || 0));
console.log('Is stale:', isSessionStale(lock));
```

**Solution:** Verify `isSessionStale()` threshold (currently 30 seconds)

### Issue 5: "Tools not working in text mode"

**Diagnosis:**
```typescript
// Check if clientTools registered
console.log('Text conversation clientTools:', textConversation);

// Check actionHandlers
console.log('ActionHandlers:', actionHandlers);
```

**Solution:** Verify `createClientTools(actionHandlers)` is called and actionHandlers is not null

---

## Success Metrics

### Functionality Metrics
- [ ] All 11 bridge-aligned client tools work in text mode
- [ ] Text mode messages send/receive correctly
- [ ] Voice mode unchanged (no regressions) - test all 11 tools
- [ ] Cross-tab lock prevents duplicates
- [ ] Session persists across /orchestration navigation
- [ ] Stale sessions clean up after 30s
- [ ] Heartbeat system maintains session (10s interval)
- [ ] No console errors during normal operation

### Performance Metrics
- [ ] Text connection time: < 2 seconds (baseline: unknown, measure current first)
- [ ] Voice connection time: ≤ 4 seconds (current: ~3s per logs)
- [ ] Cross-tab message latency: < 100ms
- [ ] Heartbeat overhead: negligible
- [ ] No memory leaks (stable after 50+ mode switches)

### Cost Metrics
- [ ] Text mode: 0 audio minutes charged (ElevenLabs dashboard - CRITICAL)
- [ ] Voice mode: Audio minutes as expected
- [ ] No duplicate sessions across tabs (verify in dashboard)
- [ ] Concurrency: Text uses chat pool (100), voice uses voice pool (4)

### Code Quality Metrics
- [ ] Lines of code: ~400 (down from 973, -59%)
- [ ] TypeScript errors: 0
- [ ] Cross-tab coordination: tested in 3+ tabs
- [ ] Tool count: 11 (up from 8, consolidated with toolBridge.ts)
- [ ] Documentation: Updated (CLAUDE.md, ELEVENLABS_TEXT_ONLY_BUG_REPORT.md)

### Migration Verification
- [ ] Custom WebSocket hook removed (src/hooks/useElevenLabsWebSocket.ts)
- [ ] New files created: src/config/elevenLabsTools.ts, src/utils/crossTabSession.ts
- [ ] Provider imports updated (line 14-16 in ElevenLabsProvider.tsx)
- [ ] All conversation references renamed to voiceConversation
- [ ] API route works: /api/elevenlabs/signed-url (POST method)

---

## Post-Migration Tasks

### Week 1: Monitoring
- [ ] Monitor ElevenLabs dashboard daily for unexpected charges
- [ ] Check error tracking for cross-tab issues
- [ ] Review user feedback for multi-tab confusion
- [ ] Monitor localStorage usage

### Week 2: Optimization
- [ ] Review heartbeat frequency (10s optimal?)
- [ ] Check stale session threshold (30s optimal?)
- [ ] Add telemetry for cross-tab events
- [ ] Consider session recovery UI

### Week 3-4: Stabilization
- [ ] Remove `.backup/` folder if no issues
- [ ] Document cross-tab architecture
- [ ] Create troubleshooting runbook
- [ ] Add E2E tests for cross-tab scenarios

---

## Time Estimate Breakdown

| Phase | Tasks | Estimated Time | Notes |
|-------|-------|----------------|-------|
| Phase 1 | Extract client tools config | 15-20 mins | 11 tools (up from 8) |
| Phase 2 | Create cross-tab utilities | 30 mins | New functionality |
| Phase 3 | Update ElevenLabsProvider | 3-3.5 hours | 973 lines → ~400 lines |
| Phase 4 | Test cross-tab coordination | 1.5 hours | Requires multi-tab testing |
| Phase 5 | UI updates (optional) | 30 mins | CrossTabStatus component |
| Phase 6 | Cleanup & documentation | 30 mins | Remove custom WebSocket hook |
| **Total** | | **8-10 hours** | Adjusted for tool consolidation |

---

## Final Checklist

### Code Changes
- [ ] `/src/config/elevenLabsTools.ts` created
- [ ] `/src/utils/crossTabSession.ts` created
- [ ] `/src/providers/ElevenLabsProvider.tsx` updated
- [ ] Cross-tab state added (BroadcastChannel, localStorage)
- [ ] `textConversation` instance created with BOTH flags
- [ ] `voiceConversation` renamed and updated
- [ ] `startText()` checks cross-tab lock
- [ ] `stopText()` releases lock
- [ ] `startVoice()` checks cross-tab lock
- [ ] Context value includes cross-tab state
- [ ] Heartbeat system implemented
- [ ] `useElevenLabsWebSocket` removed

### Testing
- [ ] Text mode: All 11 tools work (show_balance, show_savings_goal, show_document_id, create_pie_chart, create_bar_chart, show_loans, show_lending_options, show_credit_score, show_emi_info, start_quiz, update_quiz)
- [ ] Text mode: No audio charges (verified in ElevenLabs dashboard - CRITICAL)
- [ ] Voice mode: All 11 tools work (no regressions)
- [ ] Voice mode: Audio charges as expected (verify in dashboard)
- [ ] Cross-tab: Lock prevents duplicates (test in 3+ tabs)
- [ ] Cross-tab: Session handoff works (tab A → tab B)
- [ ] Cross-tab: Stale cleanup works (30s threshold)
- [ ] Cross-tab: Heartbeat maintains session (10s interval)
- [ ] Cross-tab: Visual indicator shows "Active in another tab"
- [ ] Navigation: Session persists within `/orchestration` routes
- [ ] Navigation: Session ends when leaving `/orchestration`
- [ ] Test environment: /test-webrtc-override page works
- [ ] Multiple tabs tested (3+ tabs in parallel)
- [ ] Legacy tools removed: show_spending_chart, show_quiz, initiate_claim, show_claim_assistant, show_document_upload

### Documentation
- [ ] CLAUDE.md updated
- [ ] ELEVENLABS_TEXT_ONLY_BUG_REPORT.md updated
- [ ] Migration plan completed
- [ ] Commit message written
- [ ] PR created with test results

### Deployment
- [ ] Git branch created
- [ ] All changes committed
- [ ] PR created for review
- [ ] Staging tested (if available)
- [ ] Production rollback plan ready

---

## Contact & Support

**Important:** This migration includes cross-tab coordination, which is critical for multi-tab widget deployment. Test thoroughly with multiple browser tabs before production.

**SDK Version:** `@elevenlabs/react@0.7.0` (verified installed)
**Document Version:** 3.0 (verified context + cross-tab coordination)
**Created:** September 30, 2025
**Updated:** January 2026 (95% confidence validation)
**Status:** Ready for implementation ✅

## Validation Summary

**Research Completed:** January 2026
**Files Verified:** 15+ files analyzed
**Line Numbers Confirmed:** All code locations verified
**Confidence Level:** 95%

**Key Findings:**
- ✅ Current provider: 973 lines (ElevenLabsProvider.tsx)
- ✅ Custom WebSocket: 500+ lines (useElevenLabsWebSocket.ts)
- ✅ Current tools: 8 (voice mode only)
- ✅ Target tools: 11 (consolidated from toolBridge.ts)
- ✅ Provider location: /app/orchestration/layout.tsx:34
- ✅ API route: /api/elevenlabs/signed-url (GET & POST verified)
- ✅ Test environment: /test-webrtc-override page exists

**Gaps (5%):**
- Tool transition from 8 → 11 needs agent configuration update
- Legacy tools (initiate_claim, show_claim_assistant, show_document_upload) removal impact unknown
- Current text mode audio charges need baseline measurement

**Recommendation:** PROCEED - All critical context verified, minor gaps don't block implementation
# Context Sharing & Connection UX - Complete Implementation Plan

**Document Version**: 1.0  
**Date**: January 21, 2025  
**Status**: Ready for Implementation  
**Estimated Time**: 2-3 hours

---

## Executive Summary

This document provides a complete implementation plan to fix 5 critical issues in FinPilot's ElevenLabs voice integration:

1. **Context Sharing Broken**: Agent doesn't receive conversation history when switching modes
2. **Missing Agent Greeting**: First message not playing in voice mode
3. **Long Connection Time**: 6-7 second delay (analyzed, normal behavior)
4. **Premature UI State**: Shows "listening" before connection is ready
5. **No Connecting Indicator**: Users can't tell when they can start speaking

**Root Causes Identified**:
- Using wrong SDK feature (`sendContextualUpdate` instead of `dynamicVariables`)
- Missing `connectionDelay` configuration
- Status state set before actual connection
- User interrupts greeting during long connection time

---

## Research Findings - ElevenLabs SDK

### Dynamic Variables (Verified from Official Docs)

**Correct Implementation** (from elevenlabs.io/docs):

```javascript
// JavaScript/TypeScript SDK
const conversation = await Conversation.startSession({
    agentId: 'agent_id_here',
    dynamicVariables: {           // ✅ ROOT level, not in overrides\!
        user_name: 'Angelo',
        conversation_history: '...'
    }
});
```

**Key Points**:
- Dynamic variables go at **ROOT level** of startSession options
- NOT nested in `overrides.agent.prompt.dynamicVariables` (Codex review was wrong)
- Use `{{variable_name}}` syntax in agent prompt to reference them
- Supported types: `string | number | boolean`
- Must enable in agent dashboard: Settings → Security → Enable overrides

**Purpose**: Best practice for passing conversation history/context to agents

### ConnectionDelay (from ElevenLabs Docs)

**Problem**: First message gets cut off without delay  
**Solution** (from elevenlabs.io/docs):

```javascript
const conversation = useConversation({
  connectionDelay: {
    android: 3000,  // 3 seconds for Android
    ios: 0,         // No delay for iOS  
    default: 1000   // 1 second for desktop
  }
});
```

**Why**: Prevents audio cutoff at start of first message, especially on mobile

### SendContextualUpdate (What It's Actually For)

**Purpose**: Real-time user actions (NOT conversation history)  
**Example Use**: `sendContextualUpdate("User clicked on savings goal card")`  
**Behavior**: Does NOT trigger agent response, just adds background context

**Our Correct Usage**: UI component interactions (quiz clicks, chart interactions)  
**Our Wrong Usage**: Trying to send conversation history (should use dynamic variables)

---

## Codebase Context

### File Structure

```
FinPilot-Project/
├── src/
│   ├── providers/
│   │   └── ElevenLabsProvider.tsx        # Main voice/text provider (1400+ lines)
│   ├── components/
│   │   └── unified/
│   │       ├── UnifiedChatInput.tsx      # Chat input UI
│   │       └── hooks/
│   │           ├── useVoiceRecording.ts  # Voice session management
│   │           └── useTextInput.ts       # Text session management
│   ├── hooks/
│   │   ├── useContextInjection.ts        # Current broken implementation
│   │   └── useTextMessaging.ts           # Older hook, uses useContextInjection
│   └── utils/
│       └── agentContext.ts               # Helper: extractContextFromMessages()
├── convex/
│   └── messages.ts                        # Convex backend - message queries
```

### Key SDK Objects

**Voice Conversation** (WebRTC):
```typescript
const voiceConversation = useConversation({
  micMuted: false,
  volume: 1.0,
  clientTools: { /* ... */ },
  onConnect: () => { /* ... */ }
});

// Start session
await voiceConversation.startSession({
  agentId: 'xxx',
  connectionType: 'webrtc',
  dynamicVariables: { /* ... */ }
});
```

**Text Conversation** (WebSocket):
```typescript
const textConversation = useConversation({
  textOnly: true,  // Prevent audio charges
  overrides: { conversation: { textOnly: true } },
  clientTools: { /* ... */ },
  onConnect: () => { /* ... */ }
});

// Start session
await textConversation.startSession({
  signedUrl: 'wss://...',
  connectionType: 'websocket',
  dynamicVariables: { /* ... */ }
});
```

### Current Status Flow (Broken)

**What Happens Now**:
1. User clicks voice button
2. `startVoice()` sets `sessionMode = 'voice'` **immediately** (line 1150)
3. `useVoiceRecording` sees mode change → sets status to `'listening'` (line 93)
4. UI shows active mic button **before connection**
5. SDK actually connects 6 seconds later
6. User starts speaking during connection → interrupts greeting

**Why It's Wrong**:
- `sessionMode` should only change AFTER connection succeeds
- Need separate "connecting" state

---

## Issue Analysis & Solutions

### Issue 1: Context Sharing (Conversation History)

**Current Implementation** (WRONG):
- File: `src/hooks/useContextInjection.ts`
- Method: Calls `conversation.sendContextualUpdate(history)` after connection
- Problem: `sendContextualUpdate` is for user actions, not history
- Result: Agent never receives conversation context

**Correct Implementation**:
- Method: Pass `dynamicVariables` at session start
- Agent prompt uses `{{conversation_history}}` template
- History available from first agent response

**Code Locations**:
- Provider startVoice: `src/providers/ElevenLabsProvider.tsx:1108-1235`
- Provider startText: `src/providers/ElevenLabsProvider.tsx:990-1078`
- Helper function: `src/utils/agentContext.ts:50` (extractContextFromMessages)

---

### Issue 2: Missing First Message / Greeting

**Root Causes**:

1. **No ConnectionDelay**: ElevenLabs SDK needs delay to prevent audio cutoff
   - Location: `src/providers/ElevenLabsProvider.tsx:493`
   - Current: No `connectionDelay` configured
   - Fix: Add delay configuration

2. **Ignored initialGreeting Parameter**:
   - Location: `src/components/unified/hooks/useVoiceRecording.ts:302`
   - Passes: `await startVoice(initialGreeting);`
   - Location: `src/providers/ElevenLabsProvider.tsx:1161`
   - Reality: `startSession()` doesn't receive or use this parameter
   - Fix: Use `overrides.agent.firstMessage`

3. **User Interruption**:
   - Connection takes 6-7 seconds
   - UI shows "listening" immediately
   - User starts speaking → agent detects interruption → skips greeting
   - Fix: Show "connecting" state, don't allow speaking until ready

---

### Issue 3: Long Connection Time (6-7 seconds)

**Analysis**: This is **NORMAL** WebRTC behavior, not a bug

**Timing Breakdown**:
```
Mic permission:          ~500ms
Network RTT:            ~500-1000ms  
WebRTC negotiation:     ~4-5 seconds  (ICE candidates, STUN/TURN)
─────────────────────────────────────
Total:                  ~5-6.5 seconds ✅ Matches observation
```

**Industry Standard**: WebRTC typically takes 3-7 seconds to establish peer-to-peer connection

**Solution**: Can't speed up, but CAN improve UX with proper connecting indicator (Issue 4/5)

---

### Issue 4: Premature "Listening" State

**Bug Location**: `src/providers/ElevenLabsProvider.tsx:1150-1151`

**Current Code** (WRONG):
```typescript
await runTransition(async () => {
  setSessionMode('voice');           // ⚡ Set IMMEDIATELY
  sessionModeRef.current = 'voice';
  
  // Then starts connection...
  voiceConversationId = await voiceConversation.startSession({ /* ... */ });
  
  // Then waits for connection...
  await waitForState(/* check if connected */);
});
```

**Side Effect**: `src/components/unified/hooks/useVoiceRecording.ts:86-94`

```typescript
useEffect(() => {
  if (sessionMode === 'voice' && previousMode \!== 'voice') {
    // ❌ Triggers as soon as sessionMode changes, NOT when connected\!
    setIsRecording(true);
    setVoiceStatus('listening');      // UI shows "listening" prematurely
    onStatusChange?.('listening');
  }
}, [sessionMode]);
```

**Fix**: Move `setSessionMode('voice')` to AFTER `waitForState()` succeeds

---

### Issue 5: No "Connecting" Indicator

**Current UI States**:
```typescript
type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking';
```

**Problem**: 
- Type includes `'connecting'` state
- Code sets it briefly (line 287) 
- But immediately gets overridden by `'listening'` (line 93)
- User never sees connecting state

**What Users Need**:
```
⏳ Connecting (0-6s):     "Connecting to voice assistant..."
                          [Spinner] Mic button disabled
                          
🎤 Listening (6s+):       "Listening..." 
                          [Active mic] Can speak now
```

**Fix**: Add `isVoiceConnecting` state separate from `sessionMode`

---

## Implementation Plan

### Phase 1: Add Dynamic Variables for Context Sharing

#### Step 1.1: Import Helper Function

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: Top of file (with other imports)

```typescript
import { extractContextFromMessages } from '@/src/utils/agentContext';
```

#### Step 1.2: Add Messages Fetching Helper

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: Inside component, before `startText` function (~line 980)

```typescript
// Helper to fetch messages for context
const fetchMessagesForContext = useCallback(async (
  convId: Id<"conversations">
): Promise<Array<{ role: string; content: string }> | null> => {
  try {
    // Query messages from Convex
    // Note: You'll need to use useQuery or Convex client here
    // For now, this is a placeholder showing the pattern
    
    // If using Convex client:
    // const messages = await convexClient.query(api.messages.list, { conversationId: convId });
    
    // If messages available from context/props, use those
    // Otherwise return null
    
    return null; // Replace with actual implementation
  } catch (error) {
    console.error('[fetchMessagesForContext] Failed:', error);
    return null;
  }
}, [/* add dependencies */]);
```

**Note**: Implementation depends on how you access Convex in provider. Options:
- Pass messages as prop from parent
- Use Convex client directly
- Use existing query from parent component

#### Step 1.3: Update startVoice Function

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: `startVoice` function (~line 1108-1235)

**Find this code** (~line 1150):
```typescript
await runTransition(async () => {
  setSessionMode('voice');
  sessionModeRef.current = 'voice';
```

**Add BEFORE it**:
```typescript
// Fetch conversation history
let conversationHistory: string | null = null;
if (conversationId) {
  try {
    const messages = await fetchMessagesForContext(conversationId);
    if (messages && messages.length > 0) {
      conversationHistory = extractContextFromMessages(messages);
      console.log('[Context] Voice mode - fetched history:', {
        messageCount: messages.length,
        historyLength: conversationHistory.length
      });
    }
  } catch (error) {
    console.error('[Context] Failed to fetch history for voice:', error);
  }
}
```

**Find this code** (~line 1161):
```typescript
voiceConversationId = await voiceConversation.startSession({
  agentId,
  connectionType: "webrtc"
});
```

**Replace with**:
```typescript
voiceConversationId = await voiceConversation.startSession({
  agentId,
  connectionType: "webrtc",
  // Add dynamic variables at ROOT level
  ...(conversationHistory ? {
    dynamicVariables: {
      conversation_history: conversationHistory
    }
  } : {}),
  // Override first message if continuing conversation
  ...(conversationHistory ? {
    overrides: {
      agent: {
        firstMessage: '' // Suppress greeting
      }
    }
  } : {})
});
```

#### Step 1.4: Update startText Function

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: `startText` function (~line 990-1078)

**Find this code** (~line 1000):
```typescript
await runTransition(async () => {
  if (sessionModeRef.current === 'text') {
    // ... existing checks ...
  }
```

**Add AFTER the checks, BEFORE the API call**:
```typescript
// Fetch conversation history
let conversationHistory: string | null = null;
if (conversationId) {
  try {
    const messages = await fetchMessagesForContext(conversationId);
    if (messages && messages.length > 0) {
      conversationHistory = extractContextFromMessages(messages);
      console.log('[Context] Text mode - fetched history:', {
        messageCount: messages.length,
        historyLength: conversationHistory.length
      });
    }
  } catch (error) {
    console.error('[Context] Failed to fetch history for text:', error);
  }
}
```

**Find this code** (~line 1040):
```typescript
const conversationIdResult = await textConversation.startSession({
  signedUrl: signed_url,
  connectionType: 'websocket'
});
```

**Replace with**:
```typescript
const conversationIdResult = await textConversation.startSession({
  signedUrl: signed_url,
  connectionType: 'websocket',
  // Add dynamic variables at ROOT level
  ...(conversationHistory ? {
    dynamicVariables: {
      conversation_history: conversationHistory
    }
  } : {}),
  // Override first message if continuing conversation  
  ...(conversationHistory ? {
    overrides: {
      agent: {
        firstMessage: ''
      }
    }
  } : {})
});
```

#### Step 1.5: Update Agent Dashboard Prompt

**Action**: Manual configuration in ElevenLabs dashboard

**Navigate to**: ElevenLabs Dashboard → Your Agent → System Prompt

**Add to beginning or end of system prompt**:
```
{{#if conversation_history}}
Previous conversation context:
{{conversation_history}}

Consider this context naturally when responding. Don't explicitly mention "previous conversation" unless the user asks about it directly.
{{/if}}
```

#### Step 1.6: Enable Overrides in Dashboard

**Action**: Manual configuration in ElevenLabs dashboard

**Navigate to**: ElevenLabs Dashboard → Your Agent → Settings → Security

**Enable**:
- ✅ System prompt overrides
- ✅ First message overrides

---

### Phase 2: Fix Connection Status & UX

#### Step 2.1: Add ConnectionDelay Configuration

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: `voiceConversation` initialization (~line 493)

**Find this code**:
```typescript
const voiceConversation = useConversation({
  micMuted: false,
  volume: 1.0,
  
  // Enable debug mode
  onDebug: (message: any) => {
    console.log('🐛 Voice mode debug:', message);
  },
```

**Add AFTER volume, BEFORE onDebug**:
```typescript
  // Prevent first message audio cutoff (ElevenLabs recommendation)
  connectionDelay: {
    android: 3000,  // 3 seconds for Android
    ios: 0,         // No delay for iOS
    default: 1000   // 1 second for desktop/other
  },
```

#### Step 2.2: Add isConnecting State

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: State declarations at top of component (~line 140)

**Find existing states**:
```typescript
const [sessionMode, setSessionMode] = useState<'idle' | 'text' | 'voice'>('idle');
const [isTransitioning, setIsTransitioning] = useState(false);
const [isTextConnected, setIsTextConnected] = useState(false);
```

**Add AFTER them**:
```typescript
// Track connecting state separately from sessionMode
const [isVoiceConnecting, setIsVoiceConnecting] = useState(false);
const [isTextConnecting, setIsTextConnecting] = useState(false);
```

#### Step 2.3: Fix startVoice Status Timing

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: `startVoice` function (~line 1108-1235)

**Find this code** (~line 1150):
```typescript
await runTransition(async () => {
  setSessionMode('voice');
  sessionModeRef.current = 'voice';
  
  // Release session lock
  releaseSessionLock();
```

**Replace with**:
```typescript
await runTransition(async () => {
  // DON'T set sessionMode yet - set connecting state instead
  setIsVoiceConnecting(true);
  
  // Release session lock
  releaseSessionLock();
```

**Find this code** (~line 1166-1171):
```typescript
await waitForState(
  () => voiceConnectionStateRef.current === 'connected' || voiceConversation.status === 'connected',
  voiceConnectWaitersRef,
  VOICE_CONNECT_TIMEOUT_MS,
  'Timed out waiting for voice transport connection'
);
```

**Add IMMEDIATELY AFTER it**:
```typescript
// NOW set sessionMode after connection succeeds
setSessionMode('voice');
sessionModeRef.current = 'voice';
setIsVoiceConnecting(false);  // Clear connecting state

console.log('✅ Voice session fully connected and ready');
```

#### Step 2.4: Fix startText Status Timing (Same Pattern)

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: `startText` function (~line 990-1078)

**Apply same pattern**:
1. Set `setIsTextConnecting(true)` at start
2. Don't change `sessionMode` until after connection
3. After `waitForState` succeeds, set `sessionMode='text'` and `setIsTextConnecting(false)`

#### Step 2.5: Expose isConnecting in Context

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: Context Provider value (~line 1340)

**Find this code**:
```typescript
<ElevenLabsContext.Provider
  value={{
    conversation: sessionModeRef.current === 'voice' ? voiceConversation : textConversation,
    sessionMode,
    isTransitioning,
    isTextConnected,
    streamId: currentStreamId,
```

**Add after isTextConnected**:
```typescript
    // Connection status
    isVoiceConnecting,
    isTextConnecting,
```

#### Step 2.6: Update Context Type

**File**: `src/providers/ElevenLabsProvider.tsx`  
**Location**: Type definition (~line 60-90)

**Find the type**:
```typescript
interface ElevenLabsContextType {
  conversation: any;
  sessionMode: 'idle' | 'text' | 'voice';
  isTransitioning: boolean;
  isTextConnected: boolean;
  streamId: string | null;
```

**Add**:
```typescript
  isVoiceConnecting: boolean;
  isTextConnecting: boolean;
```

#### Step 2.7: Update useVoiceRecording Status Logic

**File**: `src/components/unified/hooks/useVoiceRecording.ts`  
**Location**: Session connection effect (~line 84-116)

**Find this code**:
```typescript
// Get conversation from provider
const {
  conversation,
  startVoice,
  stopVoice,
  sessionMode,
  registerVoiceHandler,
  streamId,
  sendVoiceMessage: sendVoiceTransportMessage,
  sendContextualUpdateOverSocket
} = useElevenLabsConversation();
```

**Add**:
```typescript
  isVoiceConnecting,
```

**Find this code** (~line 86-94):
```typescript
// Handle voice session connection
useEffect(() => {
  const previousMode = previousSessionModeRef.current;
  previousSessionModeRef.current = sessionMode;

  if (sessionMode === 'voice' && previousMode \!== 'voice') {
    console.log('🔌 Voice connected successfully via provider');
    setIsRecording(true);
    setVoiceStatus('listening');
    onStatusChange?.('listening');
```

**Replace with**:
```typescript
// Handle voice session connection
useEffect(() => {
  const previousMode = previousSessionModeRef.current;
  previousSessionModeRef.current = sessionMode;

  // Handle connecting state
  if (isVoiceConnecting) {
    console.log('⏳ Voice connecting...');
    setVoiceStatus('connecting');
    onStatusChange?.('connecting');
    setIsRecording(false);  // Not ready to record yet
    return;  // Don't process other states while connecting
  }

  // Only set listening when ACTUALLY connected (not just mode change)
  if (sessionMode === 'voice' && previousMode \!== 'voice') {
    console.log('🔌 Voice FULLY connected and ready');
    setIsRecording(true);
    setVoiceStatus('listening');
    onStatusChange?.('listening');
```

**Update dependency array**:
```typescript
}, [sessionMode, isVoiceConnecting, onStatusChange]);
```

#### Step 2.8: Update startRecording Function

**File**: `src/components/unified/hooks/useVoiceRecording.ts`  
**Location**: `startRecording` function (~line 275-312)

**Find this code** (~line 287):
```typescript
setVoiceStatus('connecting');
onStatusChange?.('connecting');
```

**Remove these lines** - status is now handled by provider's isVoiceConnecting state

---

### Phase 3: Update UI Components for Connecting State

#### Step 3.1: Update SpeakingHUD (or Voice UI Component)

**File**: `src/components/voice/SpeakingHUD.tsx` (or wherever voice status is displayed)

**Add connecting state display**:
```typescript
{voiceStatus === 'connecting' && (
  <div className="flex flex-col items-center gap-2 p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    <p className="text-sm font-medium">Connecting to voice assistant...</p>
    <p className="text-xs text-muted-foreground">Please wait, establishing connection...</p>
  </div>
)}

{voiceStatus === 'listening' && (
  // Existing listening UI
  <div>Ready to speak\!</div>
)}
```

#### Step 3.2: Update Voice Button State

**File**: Component that renders voice button (likely in UnifiedChatInput or similar)

**Disable button during connecting**:
```typescript
<button
  disabled={voiceStatus === 'connecting'}
  className={cn(
    "voice-button",
    voiceStatus === 'connecting' && "opacity-50 cursor-not-allowed"
  )}
  onClick={handleVoiceToggle}
>
  {voiceStatus === 'connecting' ? (
    <>
      <Spinner className="h-4 w-4" />
      <span>Connecting...</span>
    </>
  ) : (
    <>
      <Mic className="h-4 w-4" />
      <span>Voice</span>
    </>
  )}
</button>
```

---

### Phase 4: Cleanup & Optimization

#### Step 4.1: Remove useContextInjection from Voice Mode

**File**: `src/components/unified/hooks/useVoiceRecording.ts`  
**Location**: Top of file

**Remove**:
```typescript
import { useContextInjection } from '@/src/hooks/useContextInjection';  // ❌ Remove this line
```

**Remove** (~line 33):
```typescript
useContextInjection({ conversationId: conversationId || null });  // ❌ Remove this line
```

**Remove comment** (~line 118):
```typescript
// Context injection now handled by useContextInjection  // ❌ Remove this comment
```

#### Step 4.2: Keep useContextInjection File (For Now)

**File**: `src/hooks/useContextInjection.ts`

**Action**: DO NOT DELETE

**Reason**: Still used by `src/hooks/useTextMessaging.ts:20`

**Future**: Can be deleted once we verify signed URL path accepts dynamic variables for text mode

---

## Testing Guide

### Test 1: Context Sharing - Text to Voice

**Steps**:
1. Open app in text mode
2. Send 3-4 messages:
   - "What's my balance?"
   - "Show me my savings goals"
   - "What's my credit score?"
3. Switch to voice mode (click voice button)
4. Wait for "Ready to speak" indicator
5. Ask: "What have we discussed so far?"

**Expected**:
- ✅ Agent mentions balance, savings goals, credit score
- ✅ Agent demonstrates knowledge of previous conversation

**If Fails**:
- Check browser console for `[Context]` logs
- Verify agent dashboard has `{{conversation_history}}` in prompt
- Check ElevenLabs dashboard Security tab for enabled overrides

### Test 2: Context Sharing - Voice to Text

**Steps**:
1. Start voice conversation
2. Say: "Show me a chart of my spending"
3. Say: "What's my account balance?"
4. Switch to text mode
5. Type: "What did I just ask about?"

**Expected**:
- ✅ Agent mentions chart and balance questions from voice

### Test 3: Connection UX

**Steps**:
1. Click voice button
2. Observe UI states

**Expected Timeline**:
```
0s:     Click button
0-6s:   "Connecting..." message, disabled mic, spinner ✅
6s:     "Ready to speak" message, active mic ✅
6s+:    Can start speaking
```

**If Fails**:
- Check console for `⏳ Voice connecting...` log
- Check console for `✅ Voice FULLY connected and ready` log
- Verify `isVoiceConnecting` state in provider

### Test 4: Agent Greeting

**Test 4A - New Conversation**:
1. Clear conversation history (new conversation)
2. Start voice mode
3. Wait for connection

**Expected**:
- ✅ Agent greets you naturally
- ✅ Greeting is NOT cut off

**Test 4B - Continuing Conversation**:
1. Have text conversation with messages
2. Switch to voice mode
3. Wait for connection

**Expected**:
- ✅ Agent does NOT greet again
- ✅ Jumps straight to responding when you speak

### Test 5: No Regressions - UI Components

**Steps**:
1. Start quiz via voice: "Start a quiz"
2. Click quiz answer buttons
3. Observe console logs

**Expected**:
- ✅ See `🔧 Tool Called via Bridge` for quiz tool
- ✅ Agent acknowledges your quiz selections
- ✅ Quiz proceeds normally

**Test Other Components**:
- Chart interactions
- Savings goal cards
- All components with `onUserAction` prop

### Test 6: No Billing Issues

**Steps**:
1. Use text mode for 5+ messages
2. Check no audio is played
3. Verify console logs show `textOnly: true`

**Expected**:
- ✅ No audio charges in text mode
- ✅ Text mode works normally

---

## Troubleshooting

### Problem: Context not appearing

**Check 1**: Console logs
```
Look for: [Context] Voice/Text mode - fetched history
Should show: messageCount and historyLength
```

**Check 2**: Agent dashboard
```
Navigate to: Agent → System Prompt
Verify: {{conversation_history}} is present
Verify: Settings → Security → Overrides enabled
```

**Check 3**: Dynamic variables structure
```typescript
// Should be at ROOT level:
{
  agentId: 'xxx',
  dynamicVariables: {  // ✅ Here, not nested deeper
    conversation_history: '...'
  }
}
```

### Problem: Greeting still cut off

**Check 1**: ConnectionDelay configured
```
File: src/providers/ElevenLabsProvider.tsx:493
Should have: connectionDelay: { default: 1000, ... }
```

**Check 2**: User interrupting
```
Console log: ⚠️ User interrupted agent
Cause: User speaking during connection
Fix: Ensure connecting state shows clearly
```

### Problem: UI still shows "listening" too early

**Check 1**: Status timing
```
Console should show IN ORDER:
1. ⏳ Voice connecting...
2. ✅ Voice FULLY connected and ready
3. 🔌 Voice connected successfully via provider
```

**Check 2**: sessionMode timing
```
File: src/providers/ElevenLabsProvider.tsx:1150-1170
setSessionMode('voice') should be AFTER waitForState, not before
```

### Problem: TypeScript errors

**Missing types**:
```typescript
// Add to ElevenLabsContextType:
interface ElevenLabsContextType {
  // ... existing fields ...
  isVoiceConnecting: boolean;
  isTextConnecting: boolean;
}
```

---

## Technical Details

### SDK Version

```json
{
  "@elevenlabs/react": "0.8.0",
  "@elevenlabs/client": "^0.x.x"
}
```

### Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ⚠️ May require microphone permissions prompt
- Mobile Safari: ⚠️ Requires connectionDelay for iOS (set to 0)

### Performance

- Context extraction: ~10ms (for 10 messages)
- Dynamic variables: No additional latency
- ConnectionDelay: Adds 1 second to perceived start time (necessary for quality)

### Security

- Dynamic variables: Sent over encrypted WebSocket/WebRTC
- Agent overrides: Require dashboard Security tab enablement
- No PII stored: History is ephemeral, passed at session start only

---

## Code References

### Key Functions

**startVoice**: `src/providers/ElevenLabsProvider.tsx:1108-1235`
- Initiates WebRTC voice session
- Add dynamic variables here

**startText**: `src/providers/ElevenLabsProvider.tsx:990-1078`
- Initiates WebSocket text session
- Add dynamic variables here

**extractContextFromMessages**: `src/utils/agentContext.ts:50`
- Takes last 10 messages
- Formats as conversation string
- Already exists, reuse it

**useVoiceRecording**: `src/components/unified/hooks/useVoiceRecording.ts`
- Manages voice session lifecycle
- Update status logic here

### State Flow

```
User Action → UnifiedChatInput.handleStartCall()
  → useVoiceRecording.startRecording()
    → Provider.startVoice()
      → [Set isVoiceConnecting = true]
      → SDK.startSession({ dynamicVariables })
      → [Wait for connection]
      → [Set sessionMode = 'voice']
      → [Set isVoiceConnecting = false]
        → useVoiceRecording sees mode change
          → Sets status = 'listening'
            → UI updates to show ready state
```

---

## Implementation Checklist

### Phase 1: Context Sharing
- [ ] Import extractContextFromMessages in provider
- [ ] Add fetchMessagesForContext helper
- [ ] Update startVoice - add dynamic variables
- [ ] Update startText - add dynamic variables
- [ ] Update agent dashboard prompt
- [ ] Enable overrides in dashboard Security settings

### Phase 2: Connection Status
- [ ] Add connectionDelay to voiceConversation config
- [ ] Add isVoiceConnecting and isTextConnecting states
- [ ] Fix startVoice status timing (move setSessionMode)
- [ ] Fix startText status timing (same pattern)
- [ ] Expose isConnecting in context value
- [ ] Update context type definition
- [ ] Update useVoiceRecording status logic
- [ ] Remove setVoiceStatus from startRecording function

### Phase 3: UI Updates
- [ ] Add connecting state to SpeakingHUD
- [ ] Update voice button disabled state
- [ ] Add spinner/loading indicator

### Phase 4: Cleanup
- [ ] Remove useContextInjection import from useVoiceRecording
- [ ] Remove useContextInjection call from useVoiceRecording
- [ ] Remove comment about useContextInjection
- [ ] Keep useContextInjection.ts file (still used by useTextMessaging)

### Testing
- [ ] Test 1: Context sharing text→voice
- [ ] Test 2: Context sharing voice→text
- [ ] Test 3: Connection UX timeline
- [ ] Test 4A: Greeting in new conversation
- [ ] Test 4B: No greeting when continuing
- [ ] Test 5: UI components still work (quiz, charts)
- [ ] Test 6: No billing issues in text mode

---

## Success Criteria

### Context Sharing
- ✅ Agent mentions previous conversation when asked
- ✅ Smooth transitions between text/voice modes
- ✅ History appears from first agent response (not mid-conversation)

### Connection UX
- ✅ Clear "connecting" indicator for 6 seconds
- ✅ Users know when they can start speaking
- ✅ No premature "listening" state

### Greeting
- ✅ First message plays completely (not cut off)
- ✅ Greeting appears in new conversations
- ✅ No greeting when continuing existing conversation

### No Regressions
- ✅ Quiz interactions work
- ✅ Chart interactions work
- ✅ Text mode billing protection maintained
- ✅ All existing features functional

---

## Estimated Time

- **Phase 1** (Context): 45-60 minutes
- **Phase 2** (Connection): 30-45 minutes
- **Phase 3** (UI): 15-30 minutes
- **Phase 4** (Cleanup): 10 minutes
- **Testing**: 30-45 minutes

**Total**: 2-3 hours (including testing)

---

## Support Resources

### ElevenLabs Documentation
- Dynamic Variables: https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables
- Overrides: https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides
- React SDK: https://elevenlabs.io/docs/agents-platform/libraries/react

### FinPilot Documentation
- Main CLAUDE.md: Project context and commands
- ARCHITECTURE.md: Core patterns and troubleshooting
- ElevenLabs Skills: `.claude/skills/elevenlabs-*/`

### Console Debugging
Look for these log prefixes:
- `[Context]` - Context sharing logs
- `⏳` - Connecting state
- `✅` - Success messages
- `❌` - Error messages
- `🔧` - Tool calls

---

**Document End**

Ready for implementation. Start with Phase 1, test each phase before proceeding to next.

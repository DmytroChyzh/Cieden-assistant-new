# ElevenLabs Provider Specification
# Version: 2.0
# Last updated: 2025-01-25
# Status: Retroactive specification with bug analysis

[Component ElevenLabsProvider]
Type: Client
Description: Unified provider for ElevenLabs text (WebSocket) and voice (WebRTC) conversations with cross-tab coordination and mode switching

Performance tier: 3
Requires reference:
  - text-session-lifecycle@2.0
  - voice-session-lifecycle@2.0
  - cross-tab-coordination@1.0
  - mode-switching@2.0

## Overview

Purpose: Manage ElevenLabs conversational AI sessions across two transport modes (WebSocket for text, WebRTC for voice) while preventing duplicate sessions across browser tabs and ensuring clean mode transitions.

Critical requirements:
  - Zero audio charges in text mode
  - Single active session per user (enforced across tabs)
  - Mode switches complete in <500ms
  - No resource leaks (connections, audio streams, timers, locks)
  - Conversation context preserved across mode switches

Props received:
  children: React nodes (required)
  actionHandlers: ActionHandlers (optional, client tool implementations)
  conversationId: Id<"conversations"> (optional, for message persistence)
  startStream: function (optional, for voice transcript streaming)
  updateStream: function (optional, for voice transcript updates)

## State Architecture

Session modes:
  idle: No active session
  text: WebSocket session active (textOnly mode, no audio)
  voice: WebRTC session active (audio bidirectional)

Connection states (tracked per mode):
  Text connection state: idle / connecting / connected
  Voice connection state: idle / connecting / connected

Cross-tab state:
  Is other tab active: yes/no
  Other tab mode: text / voice / none
  Tab ID: unique identifier for this tab

VAD state (Voice Activity Detection):
  VAD score: number (0.0 to 1.0)
  Is user speaking: yes/no (derived from VAD score > 0.5)

Transition state:
  Is transitioning: yes/no (prevents concurrent mode switches)
  Transition promise: reference to active transition

Internal refs (for imperative handles):
  Session mode ref: mirrors session mode state
  Text connection state ref: mirrors text connection state
  Voice connection state ref: mirrors voice connection state
  Is text connected ref: mirrors is text connected
  Conversation ID ref: current conversation ID
  Is unmounting ref: yes/no (prevents state updates during unmount)
  Has autostarted ref: yes/no (prevents multiple auto-starts)
  Text dynamic vars applied ref: yes/no (tracks if conversation history was applied)
  Is text starting ref: yes/no (prevents concurrent startText calls)
  Pending text history ref: conversation history to apply on next connect
  Voice stream initialized ref: yes/no (prevents duplicate stream creation)
  Idle timer ref: reference to text idle timeout timer

Waiter arrays (for connection/disconnection events):
  Text connect waiters: list of promises waiting for text connection
  Text disconnect waiters: list of promises waiting for text disconnection
  Voice connect waiters: list of promises waiting for voice connection
  Voice disconnect waiters: list of promises waiting for voice disconnection

Message queues:
  Pending text queue: messages to send when text connects (max 50)
  Pending voice queue: messages to send when voice connects (max 50)

Handler registrations:
  Text message handlers: set of callbacks for text messages
  Voice message handlers: set of callbacks for voice messages
  Text error handlers: set of callbacks for text transport errors

Constants:
  Text connect timeout: 8000 ms
  Text disconnect timeout: 5000 ms
  Voice connect timeout: 10000 ms
  Text idle close timeout: 300000 ms (5 minutes)
  Text WebSocket auto-start: yes/no (from env variable, default: yes)
  Max queue size: 50 messages

## Resources & Ownership

[Resource TextWebSocketConnection]
Created when: Starting text session
Cleaned up when:
  - User explicitly stops text session
  - Switching to voice mode (via fastStopText)
  - Idle timeout (5 minutes)
  - Session end_call tool invoked
  - Component unmounts
Depends on: SignedURL
Must not leak: Verify disconnected within 5 seconds
Why important: Prevents duplicate billing, enables concurrent text sessions across tabs
Expires after: 5 minutes of inactivity
Cost: Per-message billing

[Resource VoiceWebRTCConnection]
Created when: Starting voice session
Cleaned up when:
  - User explicitly stops voice session
  - Switching to text mode
  - Agent calls end_call tool
  - WebRTC connection fails
  - Component unmounts
Depends on: SessionLock
Must not leak: Verify disconnected within 10 seconds
Why important: Prevents duplicate audio charges, uses microphone and speakers
Expires after: No automatic expiry (user controls)
Cost: Per-minute audio billing

[Resource SignedURL]
Created when: Fetching for text session start
Cleaned up when: Text session started or fetch fails
Must not leak: Verify consumed within 6 seconds
Why important: Has limited TTL from ElevenLabs
Expires after: Server-defined (typically 60 seconds)

[Resource SessionLock]
Created when: Voice session connects successfully
Cleaned up when:
  - Voice session disconnects
  - Voice session fails
  - Component unmounts
  - Stale lock detected (30 seconds without heartbeat)
Depends on: VoiceWebRTCConnection
Must not leak: Verify cleared within 1 second of voice disconnect
Why important: Prevents duplicate voice sessions across tabs (duplicate audio charges)
Storage: localStorage.elevenlabs_session_lock

[Resource BroadcastChannel]
Created when: Provider mounts
Cleaned up when: Component unmounts
Must not leak: Verify closed on unmount
Why important: Cross-tab communication for session coordination

[Resource HeartbeatTimer]
Created when: Session mode becomes text or voice
Cleaned up when: Session mode becomes idle or component unmounts
Must not leak: Verify cleared when session ends
Why important: Keeps session lock fresh, broadcasts liveness to other tabs
Interval: 10 seconds

[Resource IdleTimer]
Created when: Text session connects
Cleaned up when:
  - Text session disconnects
  - User activity resets timer
  - Component unmounts
Must not leak: Verify cleared when text session ends
Why important: Prevents unused text sessions from staying open
Duration: 5 minutes

[Resource AudioStreams]
Created when: Voice session connects
Cleaned up when:
  - Voice session stops
  - Switching to text mode
  - Component unmounts
  - Page hides
Depends on: VoiceWebRTCConnection
Must not leak: Verify stopped within 1 second of voice end
Why important: Prevents microphone/speaker leaks

[Resource VoiceTranscriptStream]
Created when: Voice session connects and conversationId exists
Cleaned up when: Voice session disconnects
Depends on: VoiceWebRTCConnection, conversationId
Must not leak: Verify completed within 1 second of voice end
Why important: Streaming transcript state in database

[Resource Waiters]
Created when: Waiting for connection or disconnection
Cleaned up when:
  - Condition met (connection/disconnection achieved)
  - Timeout reached
  - Starting new session (clear stale waiters)
Must not leak: Verify all waiters resolved or rejected within their timeout
Why important: Prevent memory leaks from abandoned promises

## Provided Context Value

Exposed to consumers:
  conversation: active conversation object (text or voice based on mode)
  sessionMode: idle / text / voice
  isTransitioning: yes/no
  isTextConnected: yes/no
  streamId: voice transcript stream ID or none
  isOtherTabActive: yes/no
  otherTabMode: text / voice / none
  tabId: unique tab identifier
  vadScore: number (0.0 to 1.0)
  isUserSpeakingVAD: yes/no
  startText: function (optional conversation history)
  stopText: function
  startVoice: function (optional initial greeting, conversation history)
  stopVoice: function
  sendTextMessage: function (returns promise<yes/no>)
  sendVoiceMessage: function
  queueToolMessage: function (for persisting tool calls)
  registerTextHandler: function (returns cleanup function)
  registerVoiceHandler: function (returns cleanup function)
  registerTextErrorHandler: function (returns cleanup function)
  resetTextIdleTimer: function
  sendContextualUpdateOverSocket: function (returns yes/no)
  setPendingConversationHistory: function (optional history)

## Initialization & Lifecycle

On mount:
  - Create tab ID (unique per tab)
  - Create broadcast channel
  - Check for orphaned sessions in localStorage
  - If orphaned session is stale (>30 seconds): Clear it
  - If orphaned session is fresh: Set is other tab active: yes
  - If auto-start enabled and mode is idle: Wait up to 1 second for pending history, then start text session

On unmount:
  - Set is unmounting ref: yes
  - Stop all audio streams
  - If session lock exists and owned by this tab: Clear lock and broadcast SESSION_ENDED
  - Close broadcast channel
  - Clear all timers

On page hide:
  - Stop all audio streams

## Cross-Tab Coordination (see workflow reference)

Listen for messages:
  SESSION_STARTED: Another tab started a session
    - Set is other tab active: yes
    - Set other tab mode: message.mode

  SESSION_ENDED: Another tab ended a session
    - Set is other tab active: no
    - Set other tab mode: none

  SESSION_HEARTBEAT: Another tab is still alive
    - Set is other tab active: yes
    - Set other tab mode: message.mode

  FORCE_STOP_VOICE: Another tab forcing this tab to stop voice
    - If in voice mode and not the new owner: Stop voice session

  CLAIM_SESSION: Another tab claiming orphaned session
    - If not idle: Show warning

Broadcast messages:
  When starting voice session:
    - Send SESSION_STARTED with (conversationId, mode: voice, tabId, timestamp)

  When ending session:
    - Send SESSION_ENDED with (tabId, conversationId, mode: none, timestamp)

  Every 10 seconds while in text or voice mode:
    - Send SESSION_HEARTBEAT with (conversationId, mode, tabId, timestamp)
    - If voice mode: Update session lock heartbeat timestamp

Session lock ownership:
  Set session owner: After voice connection succeeds
  Clear session owner: On voice disconnect, voice fail, unmount
  Staleness check: If timestamp older than 30 seconds: lock is stale
  Takeover policy: If starting voice and stale lock exists: Clear it and proceed

## Dependencies

Depends on workflow:
  - text-session-lifecycle@2.0
  - voice-session-lifecycle@2.0
  - cross-tab-coordination@1.0
  - mode-switching@2.0

External dependencies:
  - @elevenlabs/react SDK (useConversation hook)
  - Convex database (for message persistence)
  - ElevenLabs API (for signed URLs)
  - Browser APIs (BroadcastChannel, localStorage, MediaStream)

## Public Methods

[Action startText]
See: text-session-lifecycle@2.0
Input parameters:
  conversationHistory: text (optional)

[Action stopText]
See: text-session-lifecycle@2.0

[Action startVoice]
See: voice-session-lifecycle@2.0
Input parameters:
  initialGreeting: text (optional)
  conversationHistory: text (optional)

[Action stopVoice]
See: voice-session-lifecycle@2.0

[Action sendTextMessage]
Input parameters:
  message: text (required)
Return: yes (queued or sent) / no (failed)

Behavior:
  If session mode: voice
    If voice connection: connected
      - Send message via WebRTC
      - Return: yes
    If voice connection: not connected
      - Add to pending voice queue (max 50)
      - Call startVoice (fire and forget)
      - Return: yes (queued)

  If session mode: text or idle
    If text connection: connected
      - Send message via WebSocket
      - Return: yes
    If text connection: not connected
      - Add to pending text queue (max 50)
      - Call startText (fire and forget)
      - Return: yes (queued)

[Action sendVoiceMessage]
Input parameters:
  message: text (required)

Execute if:
  Session mode: voice
  Voice connection: connected

Steps:
  - Send message via WebRTC conversation object

On error:
  - Save error to console

[Action queueToolMessage]
Input parameters:
  content: text (required)
  metadata: object (optional)

Steps:
  - Call handleAgentMessage with (content, metadata with toolCall: yes, timestamp)

Purpose: Persist tool call results to database (uses buffered persistence)

[Action registerTextHandler]
Input parameters:
  handler: function (event → void or promise)
Return: cleanup function

Steps:
  - Add handler to text handlers set
  - Return function that removes handler from set

[Action registerVoiceHandler]
Input parameters:
  handler: function (event → void or promise)
Return: cleanup function

Steps:
  - Add handler to voice handlers set
  - Return function that removes handler from set

[Action registerTextErrorHandler]
Input parameters:
  handler: function (error → void)
Return: cleanup function

Steps:
  - Add handler to text error handlers set
  - Return function that removes handler from set

[Action resetTextIdleTimer]
Execute if:
  Session mode: text
  Text connection state: connected

Steps:
  - Clear existing idle timer
  - Create new idle timer (5 minutes)
  - On timeout: Call stopText

[Action sendContextualUpdateOverSocket]
Input parameters:
  text: text (required)
Return: yes (sent) / no (not sent)

Execute if:
  Input text: not empty

Steps:
  - Determine active conversation (text or voice based on mode)
  - If connection: connected
    - If conversation has sendContextualUpdate method: Call it with text
    - If text mode and no sendContextualUpdate: Send as user message with "[CONTEXT_UPDATE]:" prefix
    - Return: yes
  - If connection: not connected
    - Return: no

[Action setPendingConversationHistory]
Input parameters:
  history: text (optional)

Steps:
  - If history is not empty: Set pending text history ref: history
  - If history is empty: Set pending text history ref: none

## Event Handlers (ElevenLabs SDK Callbacks)

### Text Mode Callbacks

onConnect (text):
  - Set is text connected: yes
  - Set text connection state ref: connected
  - Resolve all text connect waiters
  - Flush pending text queue:
    - While queue not empty and status: connected
      - Remove first message from queue
      - Send message via text conversation

onDisconnect (text):
  Input: disconnection details

  Stale event guard:
    - If text connection state ref: not idle
      - Show warning: "Ignoring stale disconnect event"
      - Stop processing (this prevents delayed disconnects from old sessions)

  Steps:
    - Set is text connected: no
    - Set text dynamic vars applied ref: no
    - If session mode ref: text
      - Set session mode: idle
    - Reset VAD state to 0
    - Resolve all text disconnect waiters

onMessage (text):
  Input: raw event object

  Execute if: Session mode ref: text

  Steps:
    - Call normalizeIncomingEvent with (raw event)
    - If normalized message exists:
      - Create normalized event with (source, message, via: websocket, raw)
      - Emit to all text message handlers

onError (text):
  Input: error object

  Steps:
    - Save error to console
    - If error code: 1008 or reason contains "daily limit"
      - Emit to all text error handlers with (code, reason)

onDebug (text):
  Input: debug message
  Steps:
    - Save to console with prefix "🐛 Text mode debug:"

onAgentToolResponse (text):
  Input: tool response object

  Steps:
    - Save to console with prefix "🔧 Agent tool executed (text):"
    - If tool name: end_call and tool type: system and not error
      - Show message: "Agent called end_call in text mode"
      - Wait 2 seconds
      - If still in text mode: Call stopText

onInterruption (text):
  Execute if: Session mode ref: text
  Steps:
    - Save to console: "User interrupted agent (text mode)"

### Voice Mode Callbacks

onConnect (voice):
  Execute if: Session mode ref: voice

  Steps:
    - Set is transitioning: no
    - Set voice connection state ref: connected
    - Resolve all voice connect waiters
    - If conversationId exists and startStream exists and not voice stream initialized:
      - Create stream ID: "voice-{timestamp}-{random}"
      - Set voice stream initialized ref: yes
      - Call startStream with (conversationId, streamId, userId)
      - On success: Set current stream ID: streamId
      - On error: Set voice stream initialized ref: no
    - Flush pending voice queue:
      - While queue not empty and status: connected
        - Remove first message from queue
        - Send message via voice conversation

onStatusChange (voice):
  Input: status object

  If status: connected
    - Set voice connection state ref: connected
    - Resolve all voice connect waiters

  If status: disconnected
    - Set voice connection state ref: idle
    - Resolve all voice disconnect waiters
    - If session mode ref: voice
      - Set session mode: idle
    - If current stream ID exists and updateStream exists:
      - Call updateStream with (streamId, content: "[SESSION ENDED]", isComplete: yes)
    - Set current stream ID: none
    - Set voice stream initialized ref: no
    - Reset VAD state to 0

onDisconnect (voice):
  Input: disconnection details

  Steps:
    - Save to console with reason
    - If session mode ref: voice
      - Set session mode: idle
      - If session lock owned by this tab:
        - Clear session lock
        - Broadcast SESSION_ENDED
    - Set voice connection state ref: idle
    - Reset VAD state to 0
    - Resolve all voice disconnect waiters

onMessage (voice):
  Input: raw event object

  Execute if: Session mode ref: voice

  Steps:
    - Call normalizeIncomingEvent with (raw event)
    - If normalized message exists:
      - Create normalized event with (source, message, via: webrtc, raw)
      - Emit to all voice message handlers

onError (voice):
  Input: error object
  Steps:
    - Save error to console with prefix "❌ ElevenLabs voice error"

onDebug (voice):
  Input: debug message
  Steps:
    - Save to console with prefix "🐛 Voice mode debug:"

onAgentToolResponse (voice):
  Input: tool response object

  Steps:
    - Save to console with prefix "🔧 Agent tool executed:"
    - If tool name: end_call and tool type: system and not error
      - Show message: "Agent called end_call - waiting for natural disconnect"
      - Wait 2 seconds
      - If still in voice mode: Call stopVoice

onVadScore (voice):
  Input: VAD score object

  Execute if:
    Session mode ref: voice
    Is unmounting ref: no

  Steps:
    - Read score from input
    - Calculate delta: abs(score - last VAD score)
    - Calculate is speaking: score > 0.5
    - If delta > 0.02: Set VAD score: score
    - If is speaking changed: Set is user speaking VAD: is speaking
    - Every 1.5 seconds: Save telemetry to console

onInterruption (voice):
  Execute if: Session mode ref: voice
  Steps:
    - Save to console: "User interrupted agent (voice mode)"

## Internal Utilities

[Function normalizeIncomingEvent]
Input: raw event object (unknown type)
Return: normalized event (source, message) or none

Purpose: Parse various ElevenLabs event formats into consistent structure

Logic:
  If event type: agent_response
    - Extract message from: agent_response or message or text or nested agent_response_event
    - Return: (source: ai, message)

  If nested agent_response_event exists:
    - Extract agent_response from nested object
    - Return: (source: ai, message)

  If event type: user_transcript
    - Extract message from: user_transcript or nested user_transcription_event
    - Return: (source: user, message)

  If event has message and source (ai or user):
    - Return: (source, message)

  If event is string:
    - Return: (source: ai, message: event)

  If no match:
    - Return: none

[Function emitToHandlers]
Input:
  handlers ref: set of handler functions
  event: normalized message event

Steps:
  - Convert set to array
  - For each handler:
    - Call handler with event (as promise)
    - On error: Save to console

[Function emitErrorToHandlers]
Input:
  handlers ref: set of error handler functions
  error: text transport error object

Steps:
  - Convert set to array
  - For each handler:
    - Call handler with error
    - On error: Save to console

[Function resolveWaiters]
Input: waiters ref (array of waiter objects)

Steps:
  - Remove all waiters from array
  - For each waiter:
    - Call waiter.resolve()
    - On error: Save to console

[Function rejectWaiters]
Input:
  waiters ref: array of waiter objects
  error: error object

Steps:
  - Remove all waiters from array
  - For each waiter:
    - Call waiter.reject with error
    - On error: Save to console

[Function waitForState]
Input:
  check: function returning yes/no
  waiters ref: array of waiter objects
  timeout ms: number
  timeout message: text
Return: promise

Steps:
  - If check returns yes: Resolve immediately
  - Create timeout timer with duration: timeout ms
  - On timeout:
    - Remove waiter from array
    - Reject with timeout message
  - Create waiter object with:
    - resolve: clears timeout, removes self from array, resolves
    - reject: clears timeout, removes self from array, rejects
    - timeoutId: reference to timeout
  - Add waiter to array
  - Return promise

[Function fastStopText]
Purpose: Quickly stop text session without waiting for mode state updates (used before voice start)

Input:
  textConversation: conversation object
  textConnectionStateRef: ref to connection state
  textDisconnectWaitersRef: ref to disconnect waiters
  label: text (for logging)
  timeoutMs: number

Execute if:
  Text conversation exists
  Text conversation status: connected

Steps:
  - Set text connection state ref: idle (CRITICAL: before endSession to allow onDisconnect to proceed)
  - Call textConversation.endSession()
  - Wait for status: disconnected (with timeout)
  - On timeout: Show warning

Why critical: Setting ref to idle before endSession prevents the onDisconnect handler from being ignored due to stale event guard

[Function waitForNoTransition]
Execute if: Transition promise ref exists

Steps:
  - Wait for transition promise ref to complete
  - On error: Save to console

[Function runTransition]
Purpose: Ensure only one mode transition happens at a time

Input: operation (async function)

Steps:
  - Wait for no transition (complete any existing)
  - Set is transitioning: yes
  - Create transition promise:
    - Call operation
    - On complete or error: Set is transitioning: no, Clear transition promise ref
  - Set transition promise ref: promise
  - Wait for transition promise

[Function enqueueMessage]
Input:
  queue: array of messages
  message: text

Steps:
  - If queue length >= 50: Remove first message
  - Add message to end of queue

## Configuration

Environment variables:
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID: Agent ID for voice mode (required)
  NEXT_PUBLIC_TEXT_WS_AUTOSTART: Auto-start text session on mount (default: yes)

SDK configuration (text mode):
  textOnly: yes (SDK-level flag)
  overrides.conversation.textOnly: yes (runtime override)
  clientTools: from createClientTools(actionHandlers)

SDK configuration (voice mode):
  micMuted: no (CRITICAL: microphone must be enabled)
  volume: 1.0
  clientTools: from createClientTools(actionHandlers)

## Observability

Console events:
  - Session starts: "Starting text/voice session"
  - Session ends: "Text/voice session ended"
  - Transitions: "Starting transition", "Transition complete"
  - Connections: "✅ WebSocket/WebRTC connected"
  - Disconnections: "🔌 WebSocket/WebRTC disconnected"
  - Errors: "❌ Error in text/voice mode"
  - Tool responses: "🔧 Agent tool executed"
  - Cross-tab: "📡 Cross-tab message", "🔒 Acquired session lock"
  - Warnings: "⚠️ Warning condition"
  - VAD: "[telemetry] vad score, isSpeaking" (every 1.5 seconds)

State tracking:
  - Session mode changes
  - Connection state changes
  - VAD score updates
  - Cross-tab state updates

## Known Issues & Bug Areas

Issue 1: Stale disconnect events
Location: Lines 777-783
Symptom: Delayed disconnect events from previous sessions can reset state of fresh sessions
Mitigation: textConnectionStateRef guard prevents processing disconnects when connection is active/connecting
Risk: Complex state tracking across refs and state

Issue 2: Pending history application timing
Location: Lines 1086-1104, 1149-1159
Symptom: Conversation history may not be applied if passed after session already started
Mitigation: Restart session if history provided and not yet applied
Risk: Extra session stop/start cycle increases latency

Issue 3: Concurrent startText calls
Location: Lines 1009-1018
Symptom: Multiple rapid calls to startText could cause race conditions
Mitigation: isTextStartingRef guard prevents reentrancy
Risk: Second call's history gets queued instead of applied immediately

Issue 4: Waiter cleanup
Location: Lines 94-114, 1230-1231, 1267
Symptom: Stale waiters from previous sessions can cause confusion
Mitigation: Reject stale waiters when starting new sessions
Risk: Promises may resolve/reject in unexpected order

Issue 5: Mode ref synchronization
Location: Lines 343-349, sessionModeRef usage throughout
Symptom: React state and ref can briefly be out of sync
Mitigation: Update ref in useEffect after state changes
Risk: Event handlers using ref may see stale values

Issue 6: Audio stream cleanup
Location: Lines 916-921, 964-969, 978-991
Symptom: Audio streams may leak if cleanup fails
Mitigation: Multiple cleanup points (stopVoice, stopText, unmount, pagehide)
Risk: MediaStream tracks may stay active

Issue 7: Cross-tab lock staleness
Location: Lines 486-498, 1202-1216
Symptom: Stale locks from crashed tabs block new sessions
Mitigation: 30-second staleness check, heartbeat system
Risk: Short-lived sessions may be incorrectly marked as stale

## Performance Requirements

SLO (Service Level Objective):
  - Text session start: <2 seconds (from startText call to first message ready)
  - Voice session start: <3 seconds (from startVoice call to audio ready)
  - Mode switch (text→voice): <500 ms (from user action to audio ready)
  - Mode switch (voice→text): <500 ms (from user action to text ready)
  - Message send latency: <100 ms (from sendTextMessage to network)

Time budgets (critical path):
  - Signed URL fetch: <1 second
  - WebSocket connection: <2 seconds
  - WebRTC connection: <3 seconds
  - Session cleanup: <1 second

Observability events needed:
  - state_enter: session mode changed
  - state_exit: session mode exited
  - transition_start: mode switch started
  - transition_end: mode switch completed
  - timer_start: timeout started
  - timer_stop: timeout cleared
  - resource_create: connection/lock/timer created
  - resource_cleanup: connection/lock/timer cleaned up
  - session_owner_set: lock acquired
  - session_owner_clear: lock released

## Invariants

[Invariant SingleSessionPerTab]
Check: Session mode: not idle implies exactly one of (text connection: connected, voice connection: connected)
Impact if violated: Duplicate billing, confused state

[Invariant VoiceSessionHasLock]
Check: If voice connection: connected then session lock exists and owned by this tab
Impact if violated: Multiple tabs can start voice (duplicate audio charges)

[Invariant TextSessionNoAudio]
Check: If text connection: connected then no audio streams exist
Impact if violated: Audio charges in text mode

[Invariant NoStaleWaiters]
Check: All waiters resolve or reject within their timeout + 1 second
Impact if violated: Memory leak from abandoned promises

[Invariant AllResourcesCleanedOnIdle]
Check: If session mode: idle then no connections, locks, timers, audio streams, pending waiters exist
Impact if violated: Resource leaks, billing continues

[Invariant ModeRefMatchesState]
Check: Session mode ref equals session mode state (within one render cycle)
Impact if violated: Event handlers see wrong mode, incorrect routing

[Invariant NoReentrantTransitions]
Check: At most one transition active at a time (is transitioning: yes or transition promise ref exists)
Impact if violated: Race conditions, state corruption

[Invariant QueuesBounded]
Check: Pending text queue length <= 50 and pending voice queue length <= 50
Impact if violated: Memory growth, message loss

[Invariant IdleTimerOnlyInTextMode]
Check: Idle timer exists only when text connection: connected
Impact if violated: Unexpected session closures

[Invariant StreamOnlyInVoiceMode]
Check: Current stream ID exists only when voice connection: connected
Impact if violated: Database inconsistency

## Dependencies on Other Workflows

Requires:
  - text-session-lifecycle@2.0 (see separate spec)
  - voice-session-lifecycle@2.0 (see separate spec)
  - cross-tab-coordination@1.0 (see separate spec)
  - mode-switching@2.0 (see separate spec)

Integration points:
  - ElevenLabs React SDK (useConversation hook)
  - Convex database (messages, streaming transcripts)
  - Browser APIs (BroadcastChannel, localStorage, MediaStream API)
  - Client tools (createClientTools from toolBridge)

## Security & Reliability

Authentication:
  - Signed URLs for WebSocket (server-side generation)
  - Agent ID for WebRTC (client-side, public)

Rate limiting:
  - Bounded message queues (50 per mode)
  - Idle timeout (5 minutes for text)
  - No automatic retry on failure (user must re-initiate)

Error handling:
  - All async operations have timeouts
  - Errors logged to console for debugging
  - Graceful degradation (e.g., queue messages if not connected)

Data privacy:
  - Conversation history passed as dynamic variables (encrypted in transit)
  - No sensitive data in localStorage (only session lock metadata)
  - Tool calls persisted with user consent (conversationId required)

Circuit breakers:
  - Daily limit errors stop further attempts
  - Connection failures do not retry automatically
  - Stale locks auto-expire after 30 seconds

## Testing Strategy

Critical test scenarios:
  1. Single tab text session lifecycle
  2. Single tab voice session lifecycle
  3. Mode switch text→voice→text
  4. Rapid mode switching
  5. Concurrent tabs (one tries to start while other is active)
  6. Stale lock cleanup
  7. Idle timeout in text mode
  8. Message queuing and flushing
  9. Conversation history application
  10. Resource cleanup on unmount
  11. Agent end_call tool in both modes
  12. Daily limit error handling
  13. Network failures during connection
  14. Late disconnect events

Manual testing:
  - Use /voice-chat page for voice mode testing
  - Use browser DevTools to inspect localStorage and MediaStream
  - Open multiple tabs to test cross-tab coordination
  - Check Convex dashboard for message persistence
  - Monitor ElevenLabs dashboard for session billing

Observability:
  - Console logs for all major state changes
  - VAD telemetry for voice debugging
  - Cross-tab messages visible in console
  - Error handlers for transport failures

## References

Related specifications:
  - specs/workflows/text-session-lifecycle.spec
  - specs/workflows/voice-session-lifecycle.spec
  - specs/workflows/cross-tab-coordination.spec
  - specs/workflows/mode-switching.spec
  - specs/components/elevenlabs-tools.spec

External documentation:
  - ElevenLabs React SDK: https://elevenlabs.io/docs/developer-guides/conversational-ai/react-sdk
  - ElevenLabs WebSocket API: https://elevenlabs.io/docs/api-reference/websockets
  - WebRTC API: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
  - BroadcastChannel API: https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API

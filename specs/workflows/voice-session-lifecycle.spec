# Voice Session Lifecycle Workflow
# Version: 2.0
# Last updated: 2025-01-25

[Workflow VoiceSessionLifecycle]
Version: 2.0
Description: Manages WebRTC-based voice session lifecycle with session locking and retry logic
Performance tier: 3
Requires reference:
  - performance@1.0

## Overview

Purpose: Start, maintain, and stop WebRTC voice sessions with ElevenLabs while enforcing single voice session across tabs and handling connection retries.

Critical requirements:
  - Only one voice session per user across all tabs
  - Microphone and speaker access
  - Real-time bidirectional audio
  - Voice transcript streaming to database
  - Session lock prevents duplicate audio charges
  - Force takeover of stale sessions
  - Two-attempt retry on failure (fast-stop text between attempts)

## Actors

  - client (this tab)
  - other_tabs (cross-tab coordination)
  - elevenlabs_webrtc (WebRTC server)
  - database (Convex for transcript streaming)
  - stun_turn_servers (ICE negotiation)

## Resources

[Resource WebRTCConnection]
Created when: Calling voiceConversation.startSession with agent ID
Cleaned up when:
  - User explicitly stops voice session
  - Mode switches to text
  - WebRTC connection fails
  - Agent calls end_call tool
  - Component unmounts
  - Forced stop by another tab
Must not leak: Verify disconnected within 10 seconds
Why important: Uses microphone/speakers, audio per-minute billing
Cost: Per-minute audio billing

[Resource SessionLock]
Created when: WebRTC connection succeeds
Cleaned up when:
  - Voice session disconnects
  - Voice session fails
  - Component unmounts
  - Taken over by another tab
Depends on: WebRTCConnection
Must not leak: Verify cleared within 1 second of disconnect
Why important: Prevents duplicate voice sessions across tabs (duplicate billing)
Storage: localStorage.elevenlabs_session_lock
TTL: 30 seconds (stale if no heartbeat)

[Resource AudioStreams]
Created when: WebRTC connection establishes
Cleaned up when:
  - Voice session stops
  - Mode switches to text
  - Component unmounts
  - Page hides
Depends on: WebRTCConnection
Must not leak: Verify stopped within 1 second of disconnect
Why important: Microphone and speaker access, privacy

[Resource VoiceTranscriptStream]
Created when: WebRTC connects and conversationId exists and startStream provided
Cleaned up when: Voice session disconnects
Depends on: WebRTCConnection, conversationId
Must not leak: Verify completed within 1 second of disconnect
Why important: Database state consistency
Managed by: startStream and updateStream callbacks

[Resource ConnectWaiters]
Created when: Waiting for WebRTC to connect
Cleaned up when:
  - Connection succeeds
  - Connection times out (10 seconds)
  - Starting new session (stale cleanup)
  - Retry attempt (clear before retry)
Must not leak: Verify all resolved/rejected within 10 seconds
Why important: Memory leak from abandoned promises

[Resource DisconnectWaiters]
Created when: Waiting for WebRTC to disconnect
Cleaned up when:
  - Disconnection completes
  - Disconnection times out
  - Starting new session (stale cleanup)
Must not leak: Verify all resolved/rejected within timeout
Why important: Memory leak from abandoned promises

[Resource PendingMessageQueue]
Created when: Messages sent before connection ready
Cleaned up when:
  - Connection succeeds and queue flushed
  - Queue grows beyond 50 items (oldest removed)
  - Session ends
Must not leak: Verify cleared when session ends
Why important: Memory growth
Capacity: 50 messages max

[Resource HeartbeatTimer]
Created when: WebRTC session active
Cleaned up when: Voice session ends or component unmounts
Depends on: SessionLock
Must not leak: Verify cleared when voice ends
Why important: Keeps session lock fresh
Interval: 10 seconds

## States

List: [idle, checking_lock, force_stopping, connecting, connected, disconnecting, retry_stopping, retrying]
Terminal: [idle]

State descriptions:
  idle: No voice session active
  checking_lock: Checking for existing session lock from other tabs
  force_stopping: Forcing other tab to stop voice before takeover
  connecting: Starting WebRTC connection (first attempt)
  connected: WebRTC connected and audio active
  disconnecting: Calling endSession and waiting for disconnect
  retry_stopping: Fast-stopping text before retry attempt
  retrying: Starting WebRTC connection (second attempt after fast-stop text)

## State Data

Per state:
  idle:
    - Voice connection state ref: idle
    - Voice stream initialized ref: no
    - Session mode: idle or text
    - Session lock: may exist from other tab or stale
    - Pending voice queue: may have queued messages

  checking_lock:
    - Existing lock: read from localStorage
    - Stale check: comparing timestamp to current time

  force_stopping:
    - Broadcast channel: sending FORCE_STOP_VOICE
    - Wait: 300 ms for other tab to react

  connecting:
    - Voice connection state ref: connecting
    - Transition in progress: yes
    - Connect waiters: waiting for onConnect or onStatusChange
    - Attempt: 1

  connected:
    - Voice connection state ref: connected
    - Voice stream initialized ref: yes or no
    - Session lock: owned by this tab
    - Current stream ID: transcript stream ID or none
    - Heartbeat timer: active
    - Pending voice queue: empty (flushed)
    - Session mode: voice
    - VAD state: active

  disconnecting:
    - Voice connection state ref: idle (may be set early)
    - Transition in progress: yes
    - Disconnect waiters: waiting for onDisconnect

  retry_stopping:
    - Fast-stopping text connection
    - Preparing for retry attempt

  retrying:
    - Voice connection state ref: connecting
    - Transition in progress: yes
    - Connect waiters: waiting for onConnect or onStatusChange
    - Attempt: 2 (final)

## Transitions

[Transition StartVoiceSession]
From: [idle]
To: connecting
Triggered by:
  - User calls startVoice(initialGreeting?, conversationHistory?)
  - User clicks voice button
  - Message queued while idle (sendVoiceMessage)

Execution flow (sequential stages):

  [Stage 1: Check agent ID]
  Steps:
    - Read agent ID from env variable
    - If empty: Throw error "NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not configured"

  State after Stage 1:
    Agent ID: validated

  Outcomes:
    Has agent ID → Continue to Stage 2
    No agent ID → Exit with error

  [Stage 2: Check existing lock and force takeover if needed]
  Steps:
    - Read existing lock from localStorage
    - If lock exists and mode: voice and not stale and not owned by this tab:
      - Broadcast FORCE_STOP_VOICE message with (newOwner: this tab ID)
      - Wait 300 ms for other tab to stop
    - If lock exists and stale (timestamp older than 30 seconds):
      - Clear stale lock

  State after Stage 2:
    Existing lock: cleared or forced to stop
    Wait time: 300 ms if forced

  Outcomes:
    No lock or stale lock → Continue to Stage 3
    Force stopped other tab → Wait 300 ms, Continue to Stage 3

  [Stage 3: Check if already connected]
  Steps:
    - Check session mode ref: voice and voice conversation status: connected
    - If yes: Return early (already connected)

  State after Stage 3:
    Decision: Already connected or proceed

  Outcomes:
    Already connected → Return early
    Not connected → Continue to Stage 4

  [Stage 4: Fast-stop text if active]
  Execute if: Text conversation status: connected

  Steps:
    - Call fastStopText(
        textConversation,
        textConnectionStateRef,
        textDisconnectWaitersRef,
        label: 'pre-voice',
        timeout: 2000 ms
      )

  Timeout: 2 seconds
  On timeout:
    - Show warning
    - Continue to Stage 5

  State after Stage 4:
    Text connection: disconnected or timed out

  Outcomes:
    Success → Continue to Stage 5
    Timeout → Show warning, Continue to Stage 5

  [Stage 5: Run transition wrapper]
  Steps:
    - Call runTransition with async operation
    - Set session mode: voice
    - Set session mode ref: voice
    - Set voice connection state ref: connecting
    - Reject and clear stale voice connect waiters (prevent conflicts)
    - Reject and clear stale voice disconnect waiters

  State after Stage 5:
    Session mode: voice
    Voice connection state ref: connecting
    Is transitioning: yes
    Stale waiters: cleared

  Outcomes:
    Success → Continue to Stage 6

  [Stage 6: Prepare dynamic variables]
  Steps:
    - If conversation history not empty:
      - Create dynamic variables: { conversation_history: conversationHistory }
    - If conversation history is empty:
      - Set dynamic variables: undefined
    - Prepare first message override:
      - If conversation history exists: Set first message: empty (suppress greeting)
      - If no history and initial greeting exists: Set first message: initialGreeting
      - Otherwise: Set first message: undefined

  State after Stage 6:
    Dynamic variables: prepared
    First message override: prepared

  Outcomes:
    Success → Continue to Stage 7 (first attempt)

  [Stage 7: Start WebRTC session (Attempt 1)]
  Steps:
    - Call voiceConversation.startSession({
        agentId: agent ID,
        connectionType: 'webrtc',
        dynamicVariables: prepared dynamic variables,
        overrides: {
          agent: {
            firstMessage: prepared first message
          }
        }
      })
    - Save conversation ID from result

  State after Stage 7:
    Voice conversation: starting
    Conversation ID: saved
    Attempt: 1

  Outcomes:
    Success → Continue to Stage 8
    Error → Continue to Stage 10 (retry logic)

  [Stage 8: Wait for connection (Attempt 1)]
  Steps:
    - Call waitForState(
        check: () => voice connection state ref: connected or voice conversation status: connected,
        waiters: voice connect waiters ref,
        timeout: 10000 ms,
        message: 'Timed out waiting for voice transport connection'
      )

  Timeout: 10 seconds
  On timeout:
    - Throw error
    - Go to Stage 10 (retry)

  State after Stage 8:
    Voice connection state ref: connected (set by onConnect or onStatusChange callback)

  Outcomes:
    Success → Continue to Stage 9 (finalization)
    Timeout/Error → Continue to Stage 10 (retry)

  [Stage 9: Finalization (after successful first attempt)]
  Steps:
    - Save conversation ID to conversation ID ref
    - Create session lock:
      - Session state: {conversationId, mode: voice, tabId, timestamp}
      - Call SessionLock.set(session state)
    - Broadcast SESSION_STARTED message
    - Transition to connected state

  State after Stage 9:
    Session lock: owned by this tab
    Broadcast: SESSION_STARTED sent
    Session mode: voice
    Voice connection state ref: connected

  Outcomes:
    Success → Transition to connected state (skip retry stages)

  [Stage 10: Retry preparation (only if Attempt 1 failed)]
  Execute if: Attempt 1 failed with error or timeout

  Steps:
    - Show warning: "Attempt 1 failed. Fast-stopping text and retrying voice start..."
    - Call fastStopText(
        textConversation,
        textConnectionStateRef,
        textDisconnectWaitersRef,
        label: 'fast-stop',
        timeout: 1500 ms
      )
    - Reject and clear stale voice connect waiters (prepare for retry)

  Timeout: 1.5 seconds
  On timeout:
    - Show warning
    - Continue to Stage 11

  State after Stage 10:
    Text connection: disconnected or timed out
    Stale waiters: cleared
    Ready for retry

  Outcomes:
    Success → Continue to Stage 11 (retry attempt)
    Timeout → Continue to Stage 11 (retry anyway)

  [Stage 11: Start WebRTC session (Attempt 2 - retry)]
  Steps:
    - Call voiceConversation.startSession({
        agentId: agent ID,
        connectionType: 'webrtc',
        dynamicVariables: same as Attempt 1,
        overrides: {
          agent: {
            firstMessage: same as Attempt 1
          }
        }
      })
    - Save conversation ID from result

  State after Stage 11:
    Voice conversation: starting
    Conversation ID: saved
    Attempt: 2 (final)

  Outcomes:
    Success → Continue to Stage 12
    Error → Exit transition with error (no more retries)

  [Stage 12: Wait for connection (Attempt 2)]
  Steps:
    - Call waitForState(
        check: () => voice connection state ref: connected or voice conversation status: connected,
        waiters: voice connect waiters ref,
        timeout: 5000 ms,
        message: 'Timed out waiting for voice transport connection (retry)'
      )

  Timeout: 5 seconds (shorter than first attempt)
  On timeout:
    - Throw error
    - Go to error handler

  State after Stage 12:
    Voice connection state ref: connected

  Outcomes:
    Success → Continue to Stage 13 (finalization after retry)
    Timeout/Error → Exit transition with error

  [Stage 13: Finalization (after successful retry)]
  Steps:
    - Same as Stage 9:
      - Save conversation ID to conversation ID ref
      - Create session lock
      - Broadcast SESSION_STARTED message

  State after Stage 13:
    Session lock: owned by this tab
    Session mode: voice
    Voice connection state ref: connected

  Outcomes:
    Success → Transition to connected state

Invariant checks:
  - After Stage 2: No active non-stale lock from other tabs (or 300 ms wait completed)
  - After Stage 4: Text connection state: not connected (or timed out)
  - After Stage 8 or 12: Voice connection state ref: connected
  - After Stage 9 or 13: Session lock exists and owned by this tab
  - Before finalization: Is transitioning: yes

On error (both attempts failed):
  - Set session mode: idle
  - Set session mode ref: idle
  - Set voice connection state ref: idle
  - Throw error (user must retry manually)

[Transition WebRTCConnected]
From: [connecting, retrying]
To: connected
Triggered by:
  - SDK onConnect callback fires
  - SDK onStatusChange with status: connected

Execute if: Session mode ref: voice

Steps:
  - Set is transitioning: no
  - Set voice connection state ref: connected
  - Resolve all voice connect waiters
  - If conversationId and startStream and not voice stream initialized:
    - Create stream ID: "voice-{timestamp}-{random}"
    - Set voice stream initialized ref: yes
    - Call startStream with (conversationId, streamId, userId: 'current-user')
    - On success: Set current stream ID: streamId
    - On error: Set voice stream initialized ref: no
  - Flush pending voice queue:
    - While queue not empty and voice conversation status: connected:
      - Remove first message
      - Call voiceConversation.sendUserMessage(message)
      - On error: Save to console, continue

State after transition:
  Voice connection state ref: connected
  Voice stream: initialized or failed
  Pending voice queue: empty

[Transition SendMessage]
From: [connected]
To: connected (stay in same state)
Triggered by:
  - User calls sendVoiceMessage(message)
  - Session mode: voice

Execute if:
  Voice conversation status: connected

Steps:
  - Call voiceConversation.sendUserMessage(message)

On error:
  - Save error to console

[Transition QueueMessage]
From: [idle, checking_lock, force_stopping, connecting, retrying]
To: same state
Triggered by:
  - User calls sendVoiceMessage(message)
  - Session not connected

Steps:
  - Add message to pending voice queue
  - If queue length > 50: Remove oldest message
  - Call startVoice (fire and forget)

[Transition AgentEndCall]
From: [connected]
To: disconnecting
Triggered by:
  - SDK onAgentToolResponse callback fires
  - Tool name: end_call
  - Tool type: system
  - Is error: no

Steps:
  - Save to console: "Agent called end_call - waiting for natural disconnect"
  - Wait 2 seconds (allow final audio)
  - If session mode ref still voice:
    - Call stopVoice

[Transition ForcedStop]
From: [connected]
To: disconnecting
Triggered by:
  - Received FORCE_STOP_VOICE message via BroadcastChannel
  - This tab not the new owner

Execute if:
  Session mode ref: voice
  This tab ID not equal to new owner ID

Steps:
  - Save to console: "Voice session force stopped by another tab"
  - Call stopVoice

[Transition StopVoiceSession]
From: [connecting, connected, retrying]
To: disconnecting
Triggered by:
  - User calls stopVoice
  - Switching to text mode
  - Component unmounts
  - Forced by another tab

Execute if: Session mode ref: voice

Execution flow (sequential stages):

  [Stage 1: Check if should stop]
  Steps:
    - Check session mode ref: voice
    - If no: Return early (already stopped)

  State after Stage 1:
    Decision: Proceed with stop or return early

  Outcomes:
    Already stopped → Return early
    Should stop → Continue to Stage 2

  [Stage 2: Run transition wrapper]
  Steps:
    - Call runTransition with async operation

  State after Stage 2:
    Is transitioning: yes

  Outcomes:
    Success → Continue to Stage 3

  [Stage 3: End session]
  Steps:
    - Call voiceConversation.endSession()
    - Wait 250 ms for onDisconnect/teardown to settle

  State after Stage 3:
    Voice conversation: ending
    Wait: 250 ms

  Outcomes:
    Success → Continue to Stage 4
    Error → Save to console, Continue to Stage 4

  [Stage 4: Force cleanup if onDisconnect didn't fire]
  Execute if: Session mode ref still voice (onDisconnect didn't handle cleanup)

  Steps:
    - Save to console: "onDisconnect did not fire, forcing mode change"
    - Set session mode: idle
    - Set session mode ref: idle
    - Set voice connection state ref: idle
    - If session lock owned by this tab:
      - Clear session lock
      - Broadcast SESSION_ENDED
    - Reset VAD state to 0

  State after Stage 4:
    Session mode: idle
    Voice connection state ref: idle
    Session lock: cleared
    VAD state: 0

  Outcomes:
    Success → Continue to Stage 5

  [Stage 5: Audio cleanup]
  Steps:
    - Call stopAllAudioStreams

  State after Stage 5:
    Audio streams: stopped

  Outcomes:
    Success → Continue to Stage 6
    Error → Save to console, Continue to Stage 6

  [Stage 6: Clear conversation ID]
  Steps:
    - Set conversation ID ref: none

  State after Stage 6:
    Conversation ID ref: none

  Outcomes:
    Success → Transition to idle state

Invariant checks:
  - After Stage 4: Session mode: idle
  - After Stage 5: All audio streams stopped
  - Before finalization: Session lock cleared if owned

[Transition WebRTCDisconnected]
From: [connecting, connected, disconnecting, retrying]
To: idle
Triggered by:
  - SDK onDisconnect callback fires
  - SDK onStatusChange with status: disconnected

Steps:
  - Save to console with disconnection reason
  - If session mode ref: voice:
    - Set session mode: idle
    - Set session mode ref: idle
    - If session lock owned by this tab:
      - Clear session lock
      - Broadcast SESSION_ENDED message
  - Set voice connection state ref: idle
  - Resolve all voice disconnect waiters
  - If current stream ID exists and updateStream exists:
    - Call updateStream with (streamId, content: "[SESSION ENDED]", isComplete: yes)
  - Set current stream ID: none
  - Set voice stream initialized ref: no
  - Reset VAD state to 0

State after transition:
  Voice connection state ref: idle
  Session mode: idle
  Session lock: cleared
  Current stream ID: none
  VAD state: 0

## Invariants

[Invariant VoiceSessionHasLock]
Check: If voice connection state ref: connected then session lock exists and owned by this tab
Impact if violated: Multiple tabs can have voice sessions (duplicate billing)

[Invariant OnlyOneVoiceSession]
Check: At most one tab has session lock with mode: voice at any time
Impact if violated: Duplicate audio charges, confused cross-tab state

[Invariant LockClearedOnDisconnect]
Check: Within 1 second of voice disconnect: session lock cleared (if owned)
Impact if violated: Other tabs blocked from starting voice

[Invariant AudioStreamsDependOnConnection]
Check: Audio streams exist only when voice connection state ref: connected
Impact if violated: Microphone leak, privacy issue

[Invariant TranscriptStreamDependsOnConnection]
Check: Current stream ID exists only when voice connection state ref: connected
Impact if violated: Database inconsistency

[Invariant NoWaitersInTerminalState]
Check: If state: idle then connect waiters empty and disconnect waiters empty
Impact if violated: Memory leak from abandoned promises

[Invariant HeartbeatOnlyWhenConnected]
Check: Heartbeat timer exists only when voice connection state ref: connected
Impact if violated: Timer leak or stale heartbeats

[Invariant VADOnlyInVoiceMode]
Check: VAD score updates only when session mode ref: voice
Impact if violated: Incorrect UI, wasted processing

[Invariant QueueFlushedOnConnect]
Check: Within 1 second of connected: pending voice queue is empty
Impact if violated: Messages not sent, user confusion

[Invariant RetryAtMostOnce]
Check: At most 2 connection attempts per startVoice call
Impact if violated: Infinite retry loop, poor UX

## Error Scenarios

[ErrorScenario FirstConnectionAttemptTimeout]
Starting state: connecting
Timeout: 10 seconds
Must handle:
  - Show warning to console
  - Fast-stop text connection (1.5 seconds)
  - Clear stale connect waiters
  - Retry WebRTC connection (second attempt)

Recovery: Automatic retry with shorter timeout (5 seconds)

[ErrorScenario BothConnectionAttemptsFailed]
Starting state: retrying
Timeout: 5 seconds on retry
Must handle:
  - Set session mode: idle
  - Set voice connection state ref: idle
  - Show error to user
  - Do not retry again

Recovery: User must manually retry startVoice

[ErrorScenario StaleSessionLockFromCrashedTab]
Starting state: idle → checking_lock
Trigger: Lock exists but timestamp older than 30 seconds

Must handle:
  - Detect stale lock (timestamp check)
  - Clear stale lock from localStorage
  - Proceed with voice start

Why needed: Crashed tabs don't clean up locks

[ErrorScenario ForceStopTimeoutFromOtherTab]
Starting state: connected (other tab)
Trigger: Received FORCE_STOP_VOICE but tab unresponsive

Must handle:
  - New tab waits 300 ms
  - New tab proceeds anyway
  - New tab overwrites lock
  - Old tab's lock becomes invalid

Recovery: Old tab will detect invalid lock and stop

[ErrorScenario LateDisconnectAfterForceStop]
Starting state: idle (after forced stop)
Trigger: Old session finally fires disconnect event

Must handle:
  - Check session mode ref: idle or text (not voice)
  - Process disconnect normally (safe, already idle)
  - No special guard needed (unlike text mode, voice disconnect doesn't set state to idle twice)

[ErrorScenario TranscriptStreamCreationFailed]
Starting state: connected
Trigger: startStream callback fails

Must handle:
  - Save error to console
  - Set voice stream initialized ref: no
  - Continue voice session (don't disconnect)
  - Transcript not saved (acceptable degradation)

Recovery: Voice session continues without transcript persistence

[ErrorScenario AudioStreamCleanupFailed]
Starting state: disconnecting
Trigger: stopAllAudioStreams throws error

Must handle:
  - Save error to console
  - Continue with cleanup
  - Proceed to idle state

Recovery: Best-effort cleanup, may leak MediaStream tracks

## Performance Requirements

SLO:
  - Voice session start (first attempt): <3 seconds
  - Voice session start (with retry): <6 seconds
  - Voice session stop: <1 second
  - Mode switch to voice: <500 ms (excluding retry)
  - Force stop latency: <300 ms

Time budgets (per stage):
  - Session lock check: <50 ms
  - Force stop wait: 300 ms
  - Fast-stop text (pre-voice): <2 seconds
  - WebRTC connection (attempt 1): <10 seconds
  - WebRTC connection (attempt 2): <5 seconds
  - Fast-stop text (retry prep): <1.5 seconds
  - Session cleanup: <1 second
  - Lock acquisition: <50 ms

Observability events:
  - state_enter: entering connecting, connected, disconnecting, retrying
  - state_exit: exiting each state
  - transition_start: startVoice, stopVoice
  - transition_end: transition complete
  - timer_start: heartbeat started
  - timer_stop: heartbeat cleared
  - resource_create: WebRTC created, lock acquired, stream started
  - resource_cleanup: WebRTC closed, lock cleared, stream completed
  - session_owner_set: lock acquired
  - session_owner_clear: lock cleared
  - retry_attempt: first attempt failed, starting retry

## Session Lock Ownership

Set session owner:
  Execute if: Voice connection succeeds
  Steps:
    - Create session state: {conversationId, mode: voice, tabId, timestamp}
    - Call SessionLock.set(session state)
    - Save to console: "Acquired session lock for voice mode"

Clear session owner:
  Execute if: Voice disconnect or component unmount
  Steps:
    - Read current lock
    - If lock exists and owned by this tab:
      - Call SessionLock.clear()
      - Save to console: "Cleared session lock"

Update heartbeat:
  Execute if: Voice connection active
  Steps:
    - Every 10 seconds:
      - Call SessionLock.updateHeartbeat(tabId)
      - Updates timestamp to current time

Staleness check:
  Check: Current time - lock timestamp > 30 seconds
  Action: Lock is stale, can be cleared and overwritten

Takeover policy:
  If starting voice and fresh lock exists (not stale, other tab):
    - Broadcast FORCE_STOP_VOICE with new owner: this tab ID
    - Wait 300 ms for other tab to react
    - Proceed with voice start (will overwrite lock)

## Voice Transcript Streaming

Create stream:
  Execute if:
    - Voice connection: connected
    - conversationId exists
    - startStream callback provided
    - Voice stream initialized ref: no

  Steps:
    - Create stream ID: "voice-{timestamp}-{random}"
    - Set voice stream initialized ref: yes
    - Call startStream with (conversationId, streamId, userId: 'current-user')
    - On success: Set current stream ID: streamId
    - On error:
      - Save error to console
      - Set voice stream initialized ref: no
      - Continue voice session

Complete stream:
  Execute if:
    - Voice disconnect
    - Current stream ID exists
    - updateStream callback provided

  Steps:
    - Call updateStream with (streamId, content: "[SESSION ENDED]", isComplete: yes)
    - On error: Save error to console
    - Set current stream ID: none

## VAD (Voice Activity Detection)

Track VAD score:
  Execute if:
    - Session mode ref: voice
    - Is unmounting ref: no

  Steps:
    - Read VAD score from SDK onVadScore callback
    - Calculate delta: abs(score - last VAD score)
    - Calculate is speaking: score > 0.5
    - If delta > 0.02: Set VAD score: score
    - If is speaking changed: Set is user speaking VAD: is speaking

Reset VAD on disconnect:
  Steps:
    - Set VAD score: 0
    - Set is user speaking VAD: no
    - Set last VAD score ref: 0
    - Set last is speaking ref: no

Telemetry:
  Every 1.5 seconds:
    - Save to console: "[telemetry] vad { score, isSpeaking }"

## Message Queue Behavior

Enqueue:
  Execute if: Voice connection state: not connected
  Steps:
    - If queue length >= 50: Remove oldest message (shift)
    - Add new message to end (push)
    - Call startVoice (fire and forget)

Flush:
  Execute if: Voice connection state: connected
  Steps:
    - While queue not empty and voice conversation status: connected:
      - Remove first message
      - Send message via voiceConversation.sendUserMessage
      - On error: Save to console, continue to next message

Capacity: 50 messages max
Overflow policy: FIFO (first in, first out) - oldest removed when capacity reached

## Dynamic Variables Application

When to apply:
  - On startVoice if conversation history provided

How to apply:
  - Pass as dynamicVariables in startSession call
  - Format: { conversation_history: string }

First message override:
  - If conversation history exists: Set firstMessage: empty (suppress greeting)
  - If no history and initial greeting exists: Set firstMessage: initialGreeting
  - Otherwise: Set firstMessage: undefined

## Testing Strategy

Critical test cases:
  1. Simple start and stop
  2. Start with conversation history
  3. Start with initial greeting
  4. First connection attempt timeout → automatic retry
  5. Both connection attempts fail
  6. Stale lock from crashed tab
  7. Force takeover of active session from another tab
  8. Agent end_call tool
  9. Cross-tab coordination (start in tab A, try to start in tab B)
  10. Voice transcript stream creation and completion
  11. VAD score updates
  12. Message queuing and flushing
  13. Rapid start→stop→start
  14. Audio stream cleanup on disconnect

Manual testing:
  - Use console logs to verify state transitions
  - Check localStorage for session lock
  - Monitor network tab for WebRTC connection
  - Verify audio elements created (check DevTools)
  - Test microphone and speaker access
  - Open multiple tabs to verify cross-tab locking
  - Check Convex dashboard for transcript streams

Performance testing:
  - Measure time from startVoice to connected
  - Measure time from stopVoice to disconnected
  - Verify force stop latency <300 ms
  - Check for memory leaks (waiters, timers, event listeners, audio streams)

## Known Bugs & Risks

Bug 1: Waiter cleanup on retry
Location: Lines 1230-1231, 1267
Symptom: Stale waiters from first attempt can resolve/reject during retry
Risk: Promise timing issues
Mitigation: Clear stale waiters before retry

Bug 2: Force stop timeout
Location: Lines 1202-1216
Symptom: Unresponsive tab doesn't stop within 300 ms
Risk: Brief period with duplicate voice sessions
Mitigation: Timeout and proceed, new lock overwrites old

Bug 3: Lock staleness edge case
Symptom: Lock updated by heartbeat just before staleness check
Risk: Tab considered stale when it's actually alive
Mitigation: 30-second window is generous, heartbeat every 10 seconds

Bug 4: Audio stream cleanup failure
Location: Lines 916-921
Symptom: stopAllAudioStreams may fail to stop all tracks
Risk: Microphone stays active
Mitigation: Best-effort cleanup, multiple cleanup points

Bug 5: Transcript stream creation failure
Location: Lines 574-577
Symptom: startStream callback fails
Risk: Voice session continues without transcript
Mitigation: Error logged, session continues (acceptable degradation)

Bug 6: Late disconnect after mode switch
Symptom: Voice disconnect fires after already switched to text
Risk: Incorrect mode reset
Mitigation: Check session mode ref in onDisconnect (only reset if still voice)

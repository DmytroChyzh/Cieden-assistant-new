# Text Session Lifecycle Workflow
# Version: 2.0
# Last updated: 2025-01-25

[Workflow TextSessionLifecycle]
Version: 2.0
Description: Manages WebSocket-based text session lifecycle with conversation history and idle timeout
Performance tier: 3
Requires reference:
  - performance@1.0

## Overview

Purpose: Start, maintain, and stop text-only WebSocket sessions with ElevenLabs while applying conversation history as dynamic variables and preventing audio charges.

Critical requirements:
  - Zero audio charges (textOnly flags required)
  - Conversation history applied via dynamic variables
  - Handle restart when history needs to be applied mid-session
  - Prevent concurrent startText calls
  - Auto-close after 5 minutes of inactivity
  - Ignore stale disconnect events from previous sessions

## Actors

  - client (this tab)
  - elevenlabs_api (WebSocket server)
  - database (Convex for message persistence)

## Resources

[Resource SignedURLFetch]
Created when: Starting text session
Cleaned up when:
  - Fetch completes successfully
  - Fetch times out (6 seconds)
  - Fetch fails with network error
Must not leak: Verify completed or aborted within 6 seconds
Why important: AbortController needs cleanup
Cost: API call to /api/elevenlabs/signed-url

[Resource WebSocketConnection]
Created when: Calling textConversation.startSession with signed URL
Cleaned up when:
  - User explicitly stops text session
  - Mode switches to voice
  - Idle timeout (5 minutes)
  - Agent calls end_call tool
  - Restart for dynamic variables
  - Component unmounts
Depends on: SignedURLFetch
Must not leak: Verify disconnected within 5 seconds
Why important: Prevents duplicate billing, message charges
Expires after: 5 minutes of inactivity
Cost: Per-message billing

[Resource IdleTimer]
Created when: WebSocket connects successfully
Cleaned up when:
  - User activity (resetTextIdleTimer called)
  - Text session stops
  - Mode switches to voice
  - Component unmounts
Depends on: WebSocketConnection
Must not leak: Verify cleared within 1 second of session end
Why important: Prevents runaway timers
Duration: 5 minutes (300,000 ms)

[Resource ConnectWaiters]
Created when: Waiting for WebSocket to connect
Cleaned up when:
  - Connection succeeds
  - Connection times out (8 seconds)
  - Starting new session (stale cleanup)
Must not leak: Verify all resolved/rejected within 8 seconds
Why important: Memory leak from abandoned promises

[Resource DisconnectWaiters]
Created when: Waiting for WebSocket to disconnect
Cleaned up when:
  - Disconnection completes
  - Disconnection times out (5 seconds)
Must not leak: Verify all resolved/rejected within 5 seconds
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

[Resource ConversationHistoryPending]
Created when: setPendingConversationHistory called with history
Cleaned up when:
  - Text session starts with dynamic variables
  - History applied successfully
  - Component unmounts
Must not leak: Verify consumed or cleared within 2 seconds of availability
Why important: User context may be lost

## States

List: [idle, starting, connecting, connected, disconnecting, restarting]
Terminal: [idle]

State descriptions:
  idle: No text session active
  starting: startText call in progress (reentrancy guard)
  connecting: Fetching signed URL and calling startSession
  connected: WebSocket connected and ready for messages
  disconnecting: Calling endSession and waiting for disconnect
  restarting: Stopping current session to apply dynamic variables

## State Data

Per state:
  idle:
    - Text connection state ref: idle
    - Is text connected: no
    - Is text starting ref: no
    - Text dynamic vars applied ref: no
    - Pending text history ref: none or pending history
    - Idle timer ref: none
    - Pending text queue: may have queued messages

  starting:
    - Text connection state ref: idle
    - Is text starting ref: yes
    - Transition in progress: yes

  connecting:
    - Text connection state ref: connecting
    - Is text starting ref: yes
    - Transition in progress: yes
    - Signed URL fetch in progress
    - Connect waiters: waiting for onConnect

  connected:
    - Text connection state ref: connected
    - Is text connected: yes
    - Is text starting ref: no
    - Text dynamic vars applied ref: yes or no
    - Idle timer ref: active timer
    - Pending text queue: empty (flushed)
    - Session mode: text

  disconnecting:
    - Text connection state ref: idle (set early to prevent stale disconnect processing)
    - Transition in progress: yes
    - Disconnect waiters: waiting for onDisconnect

  restarting:
    - Sub-state of disconnecting → connecting sequence
    - Purpose: Apply dynamic variables to existing session

## Transitions

[Transition StartTextSession]
From: [idle]
To: connecting
Triggered by:
  - User calls startText(conversationHistory?)
  - Auto-start on mount (if enabled and idle)
  - Message queued while idle (sendTextMessage)

Execution flow (sequential stages):

  [Stage 1: Reentrancy guard]
  Steps:
    - Check is text starting ref: no
    - If yes: Queue pending history if provided, return early
    - Set is text starting ref: yes

  State after Stage 1:
    Is text starting ref: yes

  Outcomes:
    Success → Continue to Stage 2
    Reentrancy detected → Return early (do not error)

  [Stage 2: Check if already connected]
  Steps:
    - Check session mode ref: text and (text conversation status: connected or text connection state ref: connected)
    - If yes and no conversation history: Already connected, return early
    - If yes and conversation history provided and not text dynamic vars applied:
      - Go to restarting state (restart to apply dynamic variables)
    - If yes and dynamic vars already applied: Return early

  State after Stage 2:
    - If restarting: Text connection state ref: idle, calling endSession
    - Otherwise: Continue to Stage 3

  Outcomes:
    Already connected (with or without history) → Return early
    Need restart for dynamic vars → Go to restarting, then continue to Stage 3
    Not connected → Continue to Stage 3

  [Stage 3: Run transition wrapper]
  Steps:
    - Call runTransition with async operation
    - Set session mode: text
    - Set session mode ref: text
    - Set text connection state ref: connecting

  State after Stage 3:
    Session mode: text
    Text connection state ref: connecting
    Is transitioning: yes

  Outcomes:
    Success → Continue to Stage 4
    Error → Exit transition with error

  [Stage 4: Stop voice if active]
  Execute if: Session mode ref was voice

  Steps:
    - Call stopVoice
    - Wait for voice to stop

  State after Stage 4:
    Session mode: text (voice stopped if needed)

  Outcomes:
    Success → Continue to Stage 5
    Error → Exit transition with error

  [Stage 5: Fetch signed URL]
  Steps:
    - Create AbortController
    - Set timeout: 6 seconds to abort
    - Call fetch('/api/elevenlabs/signed-url', POST with agent_id)
    - Clear timeout
    - If response not ok: Throw error
    - Read signed_url from response JSON

  Timeout: 6 seconds
  On timeout:
    - Abort fetch
    - Throw error: "Signed URL fetch timed out"

  State after Stage 5:
    - Signed URL: available
    - Abort controller: cleaned up

  Outcomes:
    Success → Continue to Stage 6
    Timeout/Error → Set text connection state ref: idle, Set session mode: idle, Exit transition with error

  [Stage 6: Prepare dynamic variables]
  Steps:
    - If conversation history not provided: Read from pending text history ref
    - If conversation history is not empty:
      - Create dynamic variables: { conversation_history: conversationHistory }
    - If conversation history is empty:
      - Set dynamic variables: undefined

  State after Stage 6:
    Dynamic variables: prepared (or undefined)

  Outcomes:
    Success → Continue to Stage 7

  [Stage 7: Start WebSocket session]
  Steps:
    - Call textConversation.startSession({
        signedUrl: signed_url,
        connectionType: 'websocket',
        dynamicVariables: prepared dynamic variables
      })
    - Set text dynamic vars applied ref: yes if history was provided
    - If text dynamic vars applied: Clear pending text history ref
    - Save conversation ID from result

  State after Stage 7:
    Text conversation: starting
    Conversation ID: saved

  Outcomes:
    Success → Continue to Stage 8
    Error → Set text connection state ref: idle, Set session mode: idle, Exit transition with error

  [Stage 8: Wait for connection]
  Execute if: Text conversation status not already connected

  Steps:
    - Call waitForState(
        check: () => text conversation status: connected or text connection state ref: connected,
        waiters: text connect waiters ref,
        timeout: 8000 ms,
        message: 'Timed out waiting for text transport to connect'
      )

  Timeout: 8 seconds
  On timeout:
    - Throw error
    - Waiters auto-rejected by waitForState

  State after Stage 8:
    Text connection state ref: connected (set by onConnect callback)
    Is text connected: yes

  Outcomes:
    Success → Continue to Stage 9
    Timeout → Set text connection state ref: idle, Set session mode: idle, Exit transition with error

  [Stage 9: Finalization]
  Steps:
    - Save conversation ID to conversation ID ref
    - Set is text starting ref: no
    - If pending history ref not empty and not applied:
      - Schedule retry: setTimeout(() => startText(pending history), 0)

  State after Stage 9:
    Is text starting ref: no
    If pending history: Retry scheduled

  Outcomes:
    Success → Transition to connected state

Invariant checks:
  - After Stage 8: Text connection state ref: connected
  - Before finalization: Is transitioning: yes

On error (any stage):
  - Set text connection state ref: idle
  - Set session mode: idle
  - Set session mode ref: idle
  - Set is text starting ref: no
  - Throw error

[Transition RestartForDynamicVariables]
From: [connected]
To: restarting → disconnecting → connecting → connected
Triggered by:
  - User calls startText(conversationHistory) while already connected
  - Conversation history provided and text dynamic vars applied ref: no

Steps:
  - Set text connection state ref: idle (allow onDisconnect to proceed)
  - Call textConversation.endSession()
  - Wait for text conversation status: disconnected (with 5 second timeout)
  - Fall through to StartTextSession transition

Timeout: 5 seconds
On timeout:
  - Show warning
  - Proceed to start anyway

Why needed: SDK doesn't support updating dynamic variables mid-session, must restart

[Transition WebSocketConnected]
From: [connecting]
To: connected
Triggered by:
  - SDK onConnect callback fires

Steps:
  - Set is text connected: yes
  - Set is text connected ref: yes
  - Set text connection state ref: connected
  - Resolve all text connect waiters
  - Flush pending text queue:
    - While queue not empty and text conversation status: connected:
      - Remove first message
      - Call textConversation.sendUserMessage(message)
      - On error: Save to console, continue
  - Create idle timer (5 minutes)

State after transition:
  Is text connected: yes
  Text connection state ref: connected
  Pending text queue: empty
  Idle timer: active

[Transition SendMessage]
From: [connected]
To: connected (stay in same state)
Triggered by:
  - User calls sendTextMessage(message)
  - Session mode: text

Steps:
  - Call textConversation.sendUserMessage(message)
  - Call resetTextIdleTimer

On error:
  - Save error to console
  - Return: no

[Transition QueueMessage]
From: [idle, starting, connecting]
To: same state
Triggered by:
  - User calls sendTextMessage(message)
  - Session not connected

Steps:
  - Add message to pending text queue
  - If queue length > 50: Remove oldest message
  - Call startText (fire and forget)
  - Return: yes (queued)

[Transition ResetIdleTimer]
From: [connected]
To: connected (stay in same state)
Triggered by:
  - User calls resetTextIdleTimer
  - User activity detected

Execute if:
  Session mode ref: text
  Text connection state ref: connected

Steps:
  - Clear existing idle timer ref
  - Create new idle timer (5 minutes)
  - On idle timeout:
    - Save to console: "Text transport idle timeout – closing session"
    - Call stopText

[Transition IdleTimeout]
From: [connected]
To: disconnecting
Triggered by:
  - Idle timer fires (5 minutes)

Steps:
  - Save to console: "Text transport idle timeout – closing session"
  - Call stopText

[Transition AgentEndCall]
From: [connected]
To: disconnecting
Triggered by:
  - SDK onAgentToolResponse callback fires
  - Tool name: end_call
  - Tool type: system
  - Is error: no

Steps:
  - Save to console: "Agent called end_call in text mode"
  - Wait 2 seconds (allow final messages)
  - If session mode ref still text:
    - Call stopText

[Transition StopTextSession]
From: [starting, connecting, connected, restarting]
To: disconnecting
Triggered by:
  - User calls stopText
  - Switching to voice mode
  - Component unmounts

Execute if:
  Session mode ref: text or text conversation status: connected

Execution flow (sequential stages):

  [Stage 1: Check if should stop]
  Steps:
    - Check session mode ref: text or text conversation status: connected
    - If no to both: Return early (already stopped)

  State after Stage 1:
    Decision: Proceed with stop or return early

  Outcomes:
    Already stopped → Return early
    Should stop → Continue to Stage 2

  [Stage 2: Run transition wrapper]
  Steps:
    - Call runTransition with async operation
    - Set text connection state ref: idle (CRITICAL: before endSession)

  State after Stage 2:
    Text connection state ref: idle (allows onDisconnect to process correctly)

  Outcomes:
    Success → Continue to Stage 3

  [Stage 3: End session]
  Execute if: Text conversation status: connected

  Steps:
    - Call textConversation.endSession()

  State after Stage 3:
    Text conversation: ending

  Outcomes:
    Success → Continue to Stage 4
    Error → Save to console, continue to Stage 4

  [Stage 4: Wait for disconnection]
  Steps:
    - Call waitForState(
        check: () => text conversation status: disconnected,
        waiters: text disconnect waiters ref,
        timeout: 5000 ms,
        message: 'Timed out waiting for text transport to disconnect'
      )

  Timeout: 5 seconds
  On timeout:
    - Show warning
    - Continue to Stage 5

  State after Stage 4:
    Text conversation status: disconnected (or timeout)

  Outcomes:
    Success → Continue to Stage 5
    Timeout → Show warning, Continue to Stage 5

  [Stage 5: Audio cleanup]
  Steps:
    - Call stopAllAudioStreams (defensive cleanup)

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
  - After Stage 4: Text conversation status: disconnected or timeout
  - Before finalization: All audio streams stopped

Note: Session mode is NOT set to idle here - onDisconnect handler will do that

[Transition FastStopText]
Purpose: Quickly stop text session before starting voice (minimal waiting)
From: [connected]
To: disconnecting
Triggered by:
  - Starting voice session (internal, before voice start)

Execute if:
  Text conversation exists
  Text conversation status: connected

Steps:
  - Set text connection state ref: idle (CRITICAL: allow onDisconnect to proceed)
  - Call textConversation.endSession()
  - Wait for text conversation status: disconnected (with 2 second timeout)

Timeout: 2 seconds
On timeout:
  - Show warning
  - Proceed anyway

Why different from StopTextSession:
  - Shorter timeout (2s vs 5s)
  - Does not run full transition wrapper
  - Used internally before voice start
  - Prioritizes speed over complete cleanup

[Transition WebSocketDisconnected]
From: [connecting, connected, disconnecting]
To: idle
Triggered by:
  - SDK onDisconnect callback fires

Stale event guard:
  - Check text connection state ref: idle
  - If not idle (connecting or connected):
    - Save warning: "Ignoring stale disconnect event"
    - Stop processing (critical guard against delayed disconnects from previous sessions)
    - Remain in current state

Steps (only if not stale):
  - Set is text connected: no
  - Set is text connected ref: no
  - Set text dynamic vars applied ref: no
  - If session mode ref: text:
    - Set session mode: idle
    - Set session mode ref: idle
  - Reset VAD state to 0
  - Resolve all text disconnect waiters

State after transition:
  Is text connected: no
  Text connection state ref: idle
  Session mode: idle (if was text)
  VAD state: 0

Why stale guard is critical:
  - WebSocket disconnect events can be delayed
  - A delayed disconnect from old session can fire after new session has started
  - This would incorrectly reset the new session's state
  - Guard: If ref is not idle, we're in a new session and should ignore the old disconnect

## Invariants

[Invariant ConnectionStateMatchesStatus]
Check: If is text connected: yes then text connection state ref: connected
Impact if violated: State inconsistency, handlers may route incorrectly

[Invariant IdleTimerOnlyWhenConnected]
Check: Idle timer ref exists only when text connection state ref: connected
Impact if violated: Unexpected session closures or timer leaks

[Invariant NoReentrantStarts]
Check: At most one startText in progress (is text starting ref: yes)
Impact if violated: Duplicate sessions, race conditions

[Invariant QueueFlushedOnConnect]
Check: Within 1 second of connected: pending text queue is empty
Impact if violated: Messages not sent, user confusion

[Invariant DynamicVarsAppliedOnce]
Check: If text dynamic vars applied ref: yes then pending text history ref: none
Impact if violated: History applied multiple times

[Invariant NoWaitersInTerminalState]
Check: If state: idle then connect waiters empty and disconnect waiters empty
Impact if violated: Memory leak from abandoned promises

[Invariant NoAudioStreamsInTextMode]
Check: If session mode: text then no audio MediaStreams active
Impact if violated: Audio charges in text mode

[Invariant StaleDisconnectsIgnored]
Check: If text connection state ref: not idle then disconnect events are ignored
Impact if violated: New sessions can be incorrectly stopped by old disconnect events

## Error Scenarios

[ErrorScenario SignedURLFetchTimeout]
Starting state: connecting
Timeout: 6 seconds
Must handle:
  - Abort fetch via AbortController
  - Set text connection state ref: idle
  - Set session mode: idle
  - Show error to user
  - Set is text starting ref: no

Recovery: User must retry startText manually

[ErrorScenario WebSocketConnectionTimeout]
Starting state: connecting
Timeout: 8 seconds
Must handle:
  - Reject all connect waiters
  - Set text connection state ref: idle
  - Set session mode: idle
  - Show error to user
  - Set is text starting ref: no

Recovery: User must retry startText manually

[ErrorScenario DisconnectTimeout]
Starting state: disconnecting
Timeout: 5 seconds
Must handle:
  - Show warning to console
  - Proceed with cleanup anyway
  - Set session mode: idle (via onDisconnect or force)
  - Clear all timers and waiters

Recovery: Force to idle state even if SDK didn't confirm

[ErrorScenario StaleDisconnectDuringNewSession]
Starting state: connected (new session)
Trigger: Delayed disconnect event from previous session

Must handle:
  - Check text connection state ref: not idle
  - Ignore the disconnect event entirely
  - Remain in connected state
  - Save warning to console

Why critical: Prevents new sessions from being incorrectly terminated by old events

[ErrorScenario ConcurrentStartTextCalls]
Starting state: starting or connecting
Trigger: User calls startText again while already starting

Must handle:
  - Check is text starting ref: yes
  - If conversation history provided: Queue it in pending text history ref
  - Return early without error
  - Let first call complete

Recovery: After first call completes, if pending history exists, retry

[ErrorScenario HistoryNotAppliedOnFirstStart]
Starting state: connected
Trigger: Conversation history was passed but text dynamic vars applied ref: no

Must handle:
  - Detect condition: conversation history provided and not applied
  - Set text connection state ref: idle
  - Call endSession
  - Wait for disconnect
  - Restart session with dynamic variables

Why needed: SDK doesn't support updating dynamic variables on live session

## Performance Requirements

SLO:
  - Text session start (no history): <2 seconds
  - Text session start (with history): <3 seconds (includes potential restart)
  - Text session stop: <1 second
  - Mode switch to text: <500 ms

Time budgets (per stage):
  - Signed URL fetch: <1 second
  - WebSocket connection: <2 seconds
  - Session cleanup: <1 second
  - Disconnect wait: <500 ms

Observability events:
  - state_enter: entering connecting, connected, disconnecting
  - state_exit: exiting each state
  - transition_start: startText, stopText
  - transition_end: transition complete
  - timer_start: idle timer started
  - timer_stop: idle timer cleared
  - resource_create: WebSocket created, signed URL fetched
  - resource_cleanup: WebSocket closed, timers cleared

## Auto-Start Behavior

Trigger:
  - Component mounts
  - Text WebSocket auto-start env variable: yes (default)
  - Has not autostarted ref: no
  - Session mode ref: idle
  - Document visibility: visible

Steps:
  - Set has autostarted ref: yes
  - Wait up to 1 second for pending text history ref to be populated
  - Call startText with pending history (or undefined)

On error:
  - Save error to console
  - Set has autostarted ref: no (allow retry)

Why wait for pending history:
  - Reduces restarts (history applied on first start instead of requiring restart)
  - Max wait is 1 second to avoid blocking

## Message Queue Behavior

Enqueue:
  Execute if: Text connection state: not connected
  Steps:
    - If queue length >= 50: Remove oldest message (shift)
    - Add new message to end (push)

Flush:
  Execute if: Text connection state: connected
  Steps:
    - While queue not empty and text conversation status: connected:
      - Remove first message
      - Send message via textConversation.sendUserMessage
      - On error: Save to console, continue to next message

Capacity: 50 messages max
Overflow policy: FIFO (first in, first out) - oldest removed when capacity reached

## Dynamic Variables Application

When to apply:
  - On startText if conversation history provided
  - On restart if history was set but not applied

How to apply:
  - Pass as dynamicVariables in startSession call
  - Format: { conversation_history: string }

When to restart for application:
  - If already connected and history provided and not applied yet
  - Restart sequence: stop → wait for disconnect → start with variables

Pending history management:
  - Set via setPendingConversationHistory(history)
  - Consumed on next startText call
  - Cleared after successful application
  - If set during start: Queued for retry after current start completes

## Stale Event Handling

Critical guard in onDisconnect:
  ```
  If text connection state ref: not idle
    Show warning: "Ignoring stale disconnect event"
    Stop processing
    Remain in current state
  ```

Why needed:
  - WebSocket disconnect events can be delayed by network
  - Rapid stop→start sequence can cause:
    1. startText sets connection state ref: connecting
    2. Old session finally fires disconnect
    3. Without guard, disconnect would reset new session
  - Guard ensures only disconnects from current session are processed

When to set connection state ref to idle:
  - BEFORE calling endSession (allows disconnect to be processed)
  - In error handlers (reset to idle)
  - Never set to idle in onDisconnect (it's already idle)

## Testing Strategy

Critical test cases:
  1. Simple start and stop
  2. Start with conversation history
  3. Start without history, then restart with history
  4. Concurrent startText calls (second should queue)
  5. Idle timeout after 5 minutes
  6. Agent end_call tool
  7. Stale disconnect event during new session (must be ignored)
  8. Message queuing and flushing
  9. Rapid start→stop→start
  10. Network failure during connection
  11. Signed URL fetch timeout
  12. WebSocket connection timeout
  13. Disconnect timeout
  14. Auto-start on mount
  15. Auto-start with pending history

Manual testing:
  - Use console logs to verify state transitions
  - Check localStorage for session state
  - Monitor network tab for WebSocket connection
  - Verify no audio elements created (check DevTools)
  - Test in multiple tabs to verify cross-tab coordination

Performance testing:
  - Measure time from startText to connected
  - Measure time from stopText to disconnected
  - Verify idle timeout accuracy
  - Check for memory leaks (waiters, timers, event listeners)

## Known Bugs & Risks

Bug 1: Pending history not applied on first start
Location: Lines 1086-1104, 1149-1159
Symptom: If history passed to startText but session already connecting, history may be queued instead of applied
Risk: Extra restart cycle, increased latency
Mitigation: Wait up to 1 second for pending history before auto-start

Bug 2: Stale disconnect events
Location: Lines 777-783
Symptom: Old disconnect events can reset new session state
Risk: User starts session, old disconnect fires, session incorrectly ends
Mitigation: textConnectionStateRef guard in onDisconnect

Bug 3: Concurrent startText calls
Location: Lines 1009-1018
Symptom: Multiple rapid startText calls can cause race conditions
Risk: Duplicate sessions, confused state
Mitigation: isTextStartingRef reentrancy guard

Bug 4: Waiter cleanup on new session start
Location: Lines 1230-1231 (voice), text needs same
Symptom: Stale waiters from previous session can resolve/reject at wrong time
Risk: Promise timing issues, memory leak
Mitigation: Reject stale waiters when starting new session

Bug 5: Audio streams not cleaned in text mode
Location: Lines 964-969
Symptom: If mode switches text→voice→text, audio streams may leak
Risk: Microphone stays active, privacy issue
Mitigation: Defensive stopAllAudioStreams in stopText

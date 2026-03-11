# Mode Switching Workflow
# Version: 2.0
# Last updated: 2025-01-25

[Workflow ModeSwitching]
Version: 2.0
Description: Orchestrates transitions between idle, text, and voice modes with clean resource handoff
Performance tier: 3
Requires reference:
  - performance@1.0
  - text-session-lifecycle@2.0
  - voice-session-lifecycle@2.0

## Overview

Purpose: Manage transitions between session modes while ensuring clean resource cleanup and preventing race conditions.

Critical requirements:
  - Mode switches complete in <500 ms (target)
  - Only one transition active at a time (single-flight)
  - Previous mode cleaned up before new mode starts
  - No resource leaks during transitions
  - Conversation context preserved across switches

## Actors

  - user (initiates mode switches)
  - text_session (WebSocket lifecycle)
  - voice_session (WebRTC lifecycle)
  - transition_manager (orchestrates switches)

## Resources

[Resource TransitionLock]
Created when: Mode switch starts
Cleaned up when: Mode switch completes or fails
Must not leak: Verify cleared within 10 seconds (max transition time)
Why important: Prevents concurrent mode switches (state corruption)
Managed by: runTransition wrapper

[Resource TransitionPromise]
Created when: Mode switch starts
Cleaned up when: Mode switch completes or fails
Depends on: TransitionLock
Must not leak: Verify resolved or rejected within 10 seconds
Why important: Allows waiting for transitions to complete

## States

List: [idle, transitioning_to_text, text, transitioning_to_voice, voice, transitioning_to_idle]
Terminal: [idle]

State descriptions:
  idle: No active session
  transitioning_to_text: Stopping voice (if active), starting text
  text: Text WebSocket session active
  transitioning_to_voice: Stopping text (if active), starting voice
  voice: Voice WebRTC session active
  transitioning_to_idle: Stopping active session (text or voice)

## State Data

Per state:
  idle:
    - Session mode: idle
    - Is transitioning: no
    - Transition promise ref: none
    - All connections: disconnected

  transitioning_to_text:
    - Session mode: transitioning from idle or voice
    - Is transitioning: yes
    - Transition promise ref: active promise
    - Voice connection: may be disconnecting

  text:
    - Session mode: text
    - Is transitioning: no
    - Transition promise ref: none
    - Text connection: connected
    - Voice connection: disconnected

  transitioning_to_voice:
    - Session mode: transitioning from idle or text
    - Is transitioning: yes
    - Transition promise ref: active promise
    - Text connection: may be disconnecting

  voice:
    - Session mode: voice
    - Is transitioning: no
    - Transition promise ref: none
    - Voice connection: connected
    - Text connection: disconnected

  transitioning_to_idle:
    - Session mode: transitioning from text or voice
    - Is transitioning: yes
    - Transition promise ref: active promise

## Transition Manager

Purpose: Ensure single-flight transitions and proper cleanup

[Function waitForNoTransition]
Execute if: Transition promise ref exists

Steps:
  - Wait for transition promise ref to complete
  - On error: Save to console

[Function runTransition]
Input: operation (async function)

Steps:
  - Call waitForNoTransition (ensure no concurrent transitions)
  - Set is transitioning: yes
  - Create transition promise:
    - Call operation
    - On complete: Set is transitioning: no, Clear transition promise ref
    - On error: Set is transitioning: no, Clear transition promise ref, re-throw
  - Set transition promise ref: promise
  - Wait for transition promise

Guarantees:
  - At most one transition active at a time
  - is transitioning flag always matches reality
  - transition promise ref always cleaned up

## Mode Switch Transitions

[Transition SwitchToText]
From: [idle, voice]
To: text
Triggered by:
  - User calls startText
  - Auto-start on mount (if enabled)
  - Message queued while idle

Execution flow (sequential stages):

  [Stage 1: Wait for no concurrent transition]
  Steps:
    - Call waitForNoTransition
    - On error: Save to console, continue

  State after Stage 1:
    No concurrent transition active

  [Stage 2: Stop voice if active]
  Execute if: Session mode ref: voice

  Steps:
    - Save to console: "Stopping voice before starting text"
    - Call stopVoice
    - Wait for voice to stop (handled by stopVoice)

  Timeout: Handled by stopVoice (includes 250 ms settle time)

  State after Stage 2:
    Voice connection: disconnected
    Session mode ref: idle (set by stopVoice)

  Outcomes:
    Voice stopped → Continue to Stage 3
    No voice active → Continue to Stage 3

  [Stage 3: Start text session]
  Steps:
    - Call text-session-lifecycle StartTextSession transition
    - Delegates to text workflow (includes runTransition)

  State after Stage 3:
    Session mode: text
    Text connection: connected

  Outcomes:
    Success → Transition to text state
    Error → Remain in idle, throw error

Performance budget: <500 ms from idle, <1 second from voice

[Transition SwitchToVoice]
From: [idle, text]
To: voice
Triggered by:
  - User calls startVoice
  - User clicks voice button

Execution flow (sequential stages):

  [Stage 1: Check for other tab voice session]
  Steps:
    - Read session lock
    - If lock exists and mode: voice and not stale and not this tab:
      - Broadcast FORCE_STOP_VOICE
      - Wait 300 ms

  State after Stage 1:
    Other tabs: notified or no conflict

  [Stage 2: Fast-stop text if active]
  Execute if: Text conversation status: connected

  Steps:
    - Call fastStopText with timeout: 2000 ms
    - Set text connection state ref: idle (before endSession)
    - Call textConversation.endSession()
    - Wait for disconnect (with timeout)

  Timeout: 2 seconds
  On timeout:
    - Show warning
    - Continue to Stage 3

  State after Stage 2:
    Text connection: disconnected or timed out

  Outcomes:
    Text stopped → Continue to Stage 3
    No text active → Continue to Stage 3
    Timeout → Show warning, Continue to Stage 3

  [Stage 3: Start voice session]
  Steps:
    - Call voice-session-lifecycle StartVoiceSession transition
    - Delegates to voice workflow (includes runTransition and retry logic)

  State after Stage 3:
    Session mode: voice
    Voice connection: connected
    Session lock: owned by this tab

  Outcomes:
    Success → Transition to voice state
    Error → Remain in idle (or text if text reconnected), throw error

Performance budget: <500 ms from idle, <3 seconds from text (includes fast-stop)

[Transition SwitchToIdle]
From: [text, voice]
To: idle
Triggered by:
  - User explicitly stops session
  - Idle timeout (text mode)
  - Agent calls end_call tool
  - Component unmounts

Execution flow (sequential stages):

  [Stage 1: Determine which session to stop]
  Steps:
    - Check session mode ref: text or voice

  State after Stage 1:
    Decision: Stop text or stop voice

  [Stage 2a: Stop text session]
  Execute if: Session mode ref: text

  Steps:
    - Call text-session-lifecycle StopTextSession transition
    - Delegates to text workflow (includes runTransition)

  State after Stage 2a:
    Session mode: idle
    Text connection: disconnected

  Outcomes:
    Success → Transition to idle state
    Error → Force to idle, save error

  [Stage 2b: Stop voice session]
  Execute if: Session mode ref: voice

  Steps:
    - Call voice-session-lifecycle StopVoiceSession transition
    - Delegates to voice workflow (includes runTransition)

  State after Stage 2b:
    Session mode: idle
    Voice connection: disconnected
    Session lock: cleared

  Outcomes:
    Success → Transition to idle state
    Error → Force to idle, save error

  [Stage 3: Ensure idle state]
  Steps:
    - Verify session mode: idle
    - Verify all connections: disconnected
    - Verify all resources: cleaned up

  State after Stage 3:
    Session mode: idle
    All connections: disconnected

  Outcomes:
    Success → Transition to idle state

Performance budget: <1 second

## Fast Mode Switching Optimizations

[Optimization FastStopText]
Purpose: Minimize latency when switching text → voice

Differences from full StopTextSession:
  - Shorter timeout: 2 seconds (vs 5 seconds)
  - Does not run full transition wrapper
  - Used internally before voice start
  - Prioritizes speed over thorough cleanup

Trade-offs:
  - Pro: Faster voice start (<500 ms budget)
  - Con: May not wait for complete cleanup
  - Mitigation: Voice start handles any remaining text cleanup

[Optimization NoStopForConcurrentText]
Purpose: Allow multiple text sessions across tabs

Implementation:
  - Text → Text: No stop needed, just restart with new variables
  - Voice → Text: Full stop of voice, then start text

Trade-offs:
  - Pro: Better UX for multi-tab usage
  - Pro: No locking overhead for text
  - Con: Multiple text sessions may confuse user
  - Mitigation: UI shows which tab is active

## Concurrent Transition Prevention

Single-flight enforcement:

waitForNoTransition:
  - If transition promise ref exists: Wait for it
  - Ensures previous transition completes before new one starts

runTransition:
  - Calls waitForNoTransition first
  - Sets is transitioning: yes
  - Clears is transitioning and promise ref on complete/error
  - Guarantees: At most one transition active

Race condition prevention:
  - User clicks voice button twice rapidly:
    - First click: Starts transition
    - Second click: Waits for first to complete, then proceeds
  - User switches voice → text → voice rapidly:
    - Each transition waits for previous to complete
    - No state corruption

## Context Preservation

Conversation history:
  - When switching modes: Pass conversationHistory parameter
  - Text mode: Applied via dynamic variables
  - Voice mode: Applied via dynamic variables
  - If history not applied yet: Queued and applied on next connect

Pending messages:
  - Each mode has separate queue (pending text queue, pending voice queue)
  - Messages queued while disconnected
  - Flushed when connection established
  - Max 50 messages per queue

User state:
  - VAD state: Reset to 0 on disconnect
  - Is text connected: Mirrors connection state
  - Stream ID: Cleared on disconnect

## Invariants

[Invariant SingleTransitionActive]
Check: At most one of (is transitioning: yes, transition promise ref exists)
Impact if violated: Concurrent transitions, state corruption

[Invariant TransitionCompletesWithinTimeout]
Check: All transitions complete within 10 seconds
Impact if violated: UI stuck in transitioning state

[Invariant OnlyOneConnectionActive]
Check: At most one of (text connection: connected, voice connection: connected)
Impact if violated: Duplicate billing, resource conflicts

[Invariant ModeMatchesConnection]
Check: If session mode: text then text connection: connected (or connecting)
Check: If session mode: voice then voice connection: connected (or connecting)
Impact if violated: State inconsistency, routing errors

[Invariant TransitionPromiseAlwaysCleared]
Check: Transition promise ref cleared within 1 second of transition end
Impact if violated: Memory leak, waitForNoTransition hangs

[Invariant NoResourcesLeakOnSwitch]
Check: When switching modes: Previous mode's resources fully cleaned up
Impact if violated: Resource leaks (connections, timers, audio streams)

## Error Scenarios

[ErrorScenario ConcurrentModeSwitchAttempts]
Starting state: transitioning_to_text
Trigger: User clicks voice button while already transitioning

Must handle:
  - Call waitForNoTransition (blocks until current transition completes)
  - Then proceed with voice transition
  - No state corruption

Recovery: Automatic queuing via waitForNoTransition

[ErrorScenario VoiceStartFailsDuringTextToVoice]
Starting state: transitioning_to_voice
Trigger: Voice connection fails after text stopped

Must handle:
  - Text already stopped
  - Voice start failed
  - Mode: idle
  - Option 1: Remain idle (user must retry)
  - Option 2: Restart text automatically (not implemented)

Recovery: User must manually retry

[ErrorScenario TextStopTimeoutDuringVoiceSwitch]
Starting state: transitioning_to_voice
Trigger: Fast-stop text times out after 2 seconds

Must handle:
  - Show warning
  - Continue with voice start anyway
  - Voice start may handle any remaining text cleanup

Recovery: Proceed with voice start (best effort)

[ErrorScenario TransitionAbandonedDueToUnmount]
Starting state: any transitioning state
Trigger: Component unmounts during transition

Must handle:
  - is unmounting ref: yes
  - Stop all ongoing operations
  - Clean up all resources immediately
  - Do not update state (component gone)

Recovery: Cleanup in unmount effect

[ErrorScenario RapidTextVoiceTextSwitching]
Starting state: text
Trigger: User switches voice → immediately back to text

Must handle:
  - First transition: text → voice
  - Second transition: Waits for first to complete
  - Then: voice → text
  - Each transition runs in sequence

Recovery: Automatic via waitForNoTransition

## Performance Requirements

SLO:
  - Idle → Text: <2 seconds
  - Idle → Voice: <3 seconds
  - Text → Voice: <500 ms (critical UX)
  - Voice → Text: <500 ms (critical UX)
  - Any → Idle: <1 second

Time budgets (per stage):
  - waitForNoTransition: <100 ms (if waiting for previous transition)
  - Fast-stop text: <2 seconds
  - Stop voice: <1 second
  - Start text: <2 seconds
  - Start voice: <3 seconds (includes retry)

Observability events:
  - transition_start: mode switch initiated
  - transition_end: mode switch completed
  - transition_error: mode switch failed
  - fast_stop_initiated: quick cleanup started
  - concurrent_attempt_queued: second transition waiting

## Testing Strategy

Critical test cases:
  1. Idle → Text → Idle
  2. Idle → Voice → Idle
  3. Text → Voice → Text
  4. Voice → Text → Voice
  5. Rapid mode switching (text → voice → text within 1 second)
  6. Concurrent switch attempts (click voice twice)
  7. Fast-stop timeout during voice switch
  8. Voice start failure after text stopped
  9. Component unmount during transition
  10. Auto-start text → user starts voice immediately

Manual testing:
  - Measure time for each mode switch (should meet SLO)
  - Check for resource leaks (connections, timers, audio streams)
  - Verify UI shows "transitioning" state
  - Test in multiple tabs
  - Monitor console for errors and warnings

Performance testing:
  - Measure mode switch latency
  - Verify <500 ms for text↔voice switches
  - Check transition lock always released
  - No hanging "is transitioning" state

## Known Issues & Risks

Issue 1: Fast-stop timeout during voice switch
Location: fastStopText call in voice start
Symptom: Text session doesn't close within 2 seconds
Risk: Voice start proceeds with text still active
Mitigation: Voice start may handle cleanup, eventual consistency

Issue 2: Transition abandoned on unmount
Location: Component unmount during transition
Symptom: is transitioning: yes when unmounting
Risk: Cleanup may be incomplete
Mitigation: Unmount effect forces cleanup, is unmounting ref prevents state updates

Issue 3: Mode switch latency exceeds 500 ms budget
Location: Text → Voice transition
Symptom: Fast-stop takes longer than expected
Risk: Poor UX, user perceives lag
Mitigation: Retry logic in voice start, eventual success

Issue 4: Concurrent transitions queued indefinitely
Location: waitForNoTransition
Symptom: Previous transition never completes (hangs)
Risk: New transitions block forever
Mitigation: 10-second timeout on all transitions, force to idle on timeout (not implemented, but should be)

Issue 5: Context loss during rapid switching
Location: Rapid mode switches
Symptom: Conversation history not applied
Risk: User context lost
Mitigation: Pending history ref queues history for next connect

## Design Decisions

Why fast-stop for voice switch:
  - Voice switch is high-frequency user action
  - <500 ms feels instantaneous
  - Full stop (5s timeout) feels sluggish
  - Trade-off: Speed over thorough cleanup
  - Acceptable: Voice start handles any remaining cleanup

Why single-flight transitions:
  - Prevents state corruption from concurrent switches
  - Simpler reasoning about state machine
  - User intent: Latest click wins (queued, not dropped)
  - Trade-off: Slight delay if user clicks rapidly

Why separate queues per mode:
  - Text and voice messages may have different formats
  - Queue flushed when respective mode connects
  - Prevents messages from wrong mode being sent
  - Trade-off: Duplicate queue management

Why no automatic text restart on voice failure:
  - User may not want text mode (intentionally chose voice)
  - Automatic restart could be surprising
  - Simpler error handling (fail to idle)
  - Trade-off: User must manually retry or switch mode

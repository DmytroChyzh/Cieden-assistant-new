# ElevenLabs Provider - Invariants & Error Scenarios
# Version: 1.0
# Last updated: 2025-01-25

## Purpose

This document consolidates all critical invariants and error scenarios across the ElevenLabs Provider and its workflows.

Use this as a reference for:
- Testing (ensure all invariants hold)
- Debugging (check which invariant violated)
- Code review (verify error scenarios handled)
- Monitoring (alert on invariant violations)

## Global Invariants (Apply to All Workflows)

[Invariant SingleSessionPerTab]
Check: Session mode: not idle implies exactly one of (text connection: connected, voice connection: connected)
Impact if violated: Duplicate billing, confused state
Workflows: All
How to verify: Check sessionMode and connection states match
Monitoring: Alert if both connections active simultaneously

[Invariant ModeRefMatchesState]
Check: Session mode ref equals session mode state (within one render cycle)
Impact if violated: Event handlers see wrong mode, incorrect routing
Workflows: All
How to verify: Compare sessionModeRef.current === sessionMode
Monitoring: Log on mismatch (expected during state update)

[Invariant AllResourcesCleanedOnIdle]
Check: If session mode: idle then no connections, locks, timers, audio streams, pending waiters exist
Impact if violated: Resource leaks, billing continues
Workflows: All
How to verify: Audit all resources when entering idle state
Monitoring: Memory profiling, count active resources

[Invariant NoReentrantTransitions]
Check: At most one transition active at a time (is transitioning: yes or transition promise ref exists)
Impact if violated: Race conditions, state corruption
Workflows: All
How to verify: Check isTransitioning flag and transitionPromiseRef
Monitoring: Alert if multiple transitions detected

[Invariant NoStaleWaiters]
Check: All waiters resolve or reject within their timeout + 1 second
Impact if violated: Memory leak from abandoned promises
Workflows: Text, Voice
How to verify: Track waiter lifetimes
Monitoring: Count pending waiters over time

## Text Mode Invariants

[Invariant TextConnectionStateMatchesStatus]
Check: If is text connected: yes then text connection state ref: connected
Impact if violated: State inconsistency, handlers may route incorrectly
How to verify: isTextConnected === (textConnectionStateRef.current === 'connected')
Monitoring: Log on mismatch

[Invariant IdleTimerOnlyWhenConnected]
Check: Idle timer ref exists only when text connection state ref: connected
Impact if violated: Unexpected session closures or timer leaks
How to verify: Check idleTimerRef when in different states
Monitoring: Count active timers

[Invariant NoReentrantStarts]
Check: At most one startText in progress (is text starting ref: yes)
Impact if violated: Duplicate sessions, race conditions
How to verify: Check isTextStartingRef.current
Monitoring: Alert if startText called while already starting

[Invariant QueueFlushedOnConnect]
Check: Within 1 second of connected: pending text queue is empty
Impact if violated: Messages not sent, user confusion
How to verify: Check pendingTextQueueRef.current.length === 0 after connect
Monitoring: Track queue length over time

[Invariant DynamicVarsAppliedOnce]
Check: If text dynamic vars applied ref: yes then pending text history ref: none
Impact if violated: History applied multiple times
How to verify: textDynVarsAppliedRef.current === true implies pendingTextHistoryRef.current === null
Monitoring: Log when dynamic vars applied

[Invariant StaleDisconnectsIgnored]
Check: If text connection state ref: not idle then disconnect events are ignored
Impact if violated: New sessions can be incorrectly stopped by old disconnect events
How to verify: Verify onDisconnect checks textConnectionStateRef.current
Monitoring: Count ignored disconnect events

[Invariant NoAudioStreamsInTextMode]
Check: If session mode: text then no audio MediaStreams active
Impact if violated: Audio charges in text mode
How to verify: Query MediaStream API for active streams
Monitoring: Alert if audio detected in text mode (critical for billing)

## Voice Mode Invariants

[Invariant VoiceSessionHasLock]
Check: If voice connection state ref: connected then session lock exists and owned by this tab
Impact if violated: Multiple tabs can have voice sessions (duplicate billing)
How to verify: voiceConnectionStateRef.current === 'connected' implies SessionLock.get()?.tabId === tabId
Monitoring: Alert if voice active without lock (critical for billing)

[Invariant OnlyOneVoiceSession]
Check: At most one tab has session lock with mode: voice at any time
Impact if violated: Duplicate audio charges, confused cross-tab state
How to verify: Count non-stale voice locks in localStorage
Monitoring: Alert if multiple voice locks detected

[Invariant LockClearedOnDisconnect]
Check: Within 1 second of voice disconnect: session lock cleared (if owned)
Impact if violated: Other tabs blocked from starting voice
How to verify: Time from disconnect to lock clear
Monitoring: Track lock clear latency

[Invariant AudioStreamsDependOnConnection]
Check: Audio streams exist only when voice connection state ref: connected
Impact if violated: Microphone leak, privacy issue
How to verify: Query MediaStream API, check connection state
Monitoring: Alert if audio streams active without connection

[Invariant TranscriptStreamDependsOnConnection]
Check: Current stream ID exists only when voice connection state ref: connected
Impact if violated: Database inconsistency
How to verify: currentStreamId !== null implies voiceConnectionStateRef.current === 'connected'
Monitoring: Track stream lifecycle

[Invariant HeartbeatOnlyWhenConnected]
Check: Heartbeat timer exists only when voice connection state ref: connected
Impact if violated: Timer leak or stale heartbeats
How to verify: Check heartbeat timer when in different states
Monitoring: Count active heartbeat timers

[Invariant VADOnlyInVoiceMode]
Check: VAD score updates only when session mode ref: voice
Impact if violated: Incorrect UI, wasted processing
How to verify: VAD updates check sessionModeRef.current === 'voice'
Monitoring: Log VAD updates outside voice mode

[Invariant RetryAtMostOnce]
Check: At most 2 connection attempts per startVoice call
Impact if violated: Infinite retry loop, poor UX
How to verify: Track attempt count
Monitoring: Alert if >2 attempts

## Cross-Tab Coordination Invariants

[Invariant AtMostOneVoiceLock]
Check: At most one non-stale session lock with mode: voice exists in localStorage
Impact if violated: Multiple tabs can start voice (duplicate billing)
How to verify: Count non-stale voice locks
Monitoring: Alert if multiple voice locks (critical for billing)

[Invariant LockOwnershipMatchesSession]
Check: If this tab has voice session active then session lock owned by this tab
Impact if violated: Orphaned voice session, other tabs can't start
How to verify: sessionMode === 'voice' implies SessionLock.get()?.tabId === tabId
Monitoring: Alert on ownership mismatch

[Invariant HeartbeatKeepsLockFresh]
Check: If voice session active then lock timestamp updated within 10 seconds
Impact if violated: Lock becomes stale, other tabs can take over
How to verify: Date.now() - lock.timestamp < 10000
Monitoring: Track heartbeat regularity

[Invariant BroadcastChannelClosedOnUnmount]
Check: Broadcast channel closed when component unmounts
Impact if violated: Memory leak, orphaned listeners
How to verify: Check channel.onmessage === null after unmount
Monitoring: Count active channels

[Invariant IgnoreOwnMessages]
Check: Messages from this tab ID are ignored
Impact if violated: Infinite message loops, confused state
How to verify: Verify message handlers check tabId !== message.tabId
Monitoring: Log own messages received

[Invariant TextSessionsNoLock]
Check: Text sessions do not create or update session locks
Impact if violated: Text sessions would block each other unnecessarily
How to verify: Starting text session doesn't call SessionLock.set
Monitoring: Alert if text session creates lock

## Mode Switching Invariants

[Invariant SingleTransitionActive]
Check: At most one of (is transitioning: yes, transition promise ref exists)
Impact if violated: Concurrent transitions, state corruption
How to verify: isTransitioning === (transitionPromiseRef.current !== null)
Monitoring: Alert on inconsistency

[Invariant TransitionCompletesWithinTimeout]
Check: All transitions complete within 10 seconds
Impact if violated: UI stuck in transitioning state
How to verify: Time from transition start to end
Monitoring: Alert if transition exceeds 10 seconds

[Invariant OnlyOneConnectionActive]
Check: At most one of (text connection: connected, voice connection: connected)
Impact if violated: Duplicate billing, resource conflicts
How to verify: !(isTextConnected && voiceConnectionStateRef.current === 'connected')
Monitoring: Alert if both connected

[Invariant ModeMatchesConnection]
Check: If session mode: text then text connection: connected (or connecting)
Check: If session mode: voice then voice connection: connected (or connecting)
Impact if violated: State inconsistency, routing errors
How to verify: sessionMode matches active connection
Monitoring: Log on mismatch

[Invariant TransitionPromiseAlwaysCleared]
Check: Transition promise ref cleared within 1 second of transition end
Impact if violated: Memory leak, waitForNoTransition hangs
How to verify: transitionPromiseRef.current === null when isTransitioning === false
Monitoring: Track promise ref lifetime

[Invariant NoResourcesLeakOnSwitch]
Check: When switching modes: Previous mode's resources fully cleaned up
Impact if violated: Resource leaks (connections, timers, audio streams)
How to verify: Audit resources after mode switch
Monitoring: Count active resources per mode

## Error Scenarios (Consolidated)

### Timeout Errors

[ErrorScenario SignedURLFetchTimeout]
Workflows: Text
Timeout: 6 seconds
Symptoms: Fetch hangs or network slow
Must handle:
  - Abort fetch via AbortController
  - Set text connection state ref: idle
  - Set session mode: idle
  - Show error to user
Recovery: User must retry startText manually
Prevention: Network monitoring, fallback URL

[ErrorScenario WebSocketConnectionTimeout]
Workflows: Text
Timeout: 8 seconds
Symptoms: WebSocket connection hangs
Must handle:
  - Reject all connect waiters
  - Set text connection state ref: idle
  - Set session mode: idle
  - Show error to user
Recovery: User must retry startText manually
Prevention: Health check before starting

[ErrorScenario TextDisconnectTimeout]
Workflows: Text
Timeout: 5 seconds
Symptoms: WebSocket disconnect hangs
Must handle:
  - Show warning to console
  - Proceed with cleanup anyway
  - Set session mode: idle
Recovery: Force to idle state
Prevention: None (best effort)

[ErrorScenario VoiceConnectionTimeout]
Workflows: Voice
Timeout: 10 seconds (first attempt), 5 seconds (retry)
Symptoms: WebRTC connection hangs
Must handle:
  - Show warning to console
  - Trigger retry (if first attempt)
  - On second timeout: Set session mode: idle, show error
Recovery: Automatic retry once, then user retry
Prevention: Network quality check

[ErrorScenario IdleTimeout]
Workflows: Text
Timeout: 5 minutes
Symptoms: No user activity
Must handle:
  - Call stopText
  - Clean up resources
Recovery: User can restart session
Prevention: User activity resets timer

### Stale Event Errors

[ErrorScenario StaleDisconnectDuringNewSession]
Workflows: Text
Symptoms: Delayed disconnect event from previous session
Must handle:
  - Check text connection state ref: not idle
  - Ignore the disconnect event entirely
  - Remain in connected state
  - Save warning to console
Recovery: No action needed (guard prevents issue)
Prevention: Connection state ref guard in onDisconnect
Why critical: Prevents new sessions from being incorrectly terminated

[ErrorScenario LateDisconnectAfterForceStop]
Workflows: Voice
Symptoms: Old session finally fires disconnect event after forced stop
Must handle:
  - Check session mode ref: idle or text (not voice)
  - Process disconnect normally (safe, already idle)
Recovery: No action needed
Prevention: Mode check in onDisconnect

### Concurrent Operation Errors

[ErrorScenario ConcurrentStartTextCalls]
Workflows: Text
Symptoms: Multiple rapid startText calls
Must handle:
  - Check is text starting ref: yes
  - If conversation history provided: Queue it in pending text history ref
  - Return early without error
  - Let first call complete
Recovery: After first call completes, if pending history exists, retry
Prevention: isTextStartingRef reentrancy guard

[ErrorScenario ConcurrentModeSwitchAttempts]
Workflows: Mode Switching
Symptoms: User clicks voice button while already transitioning
Must handle:
  - Call waitForNoTransition (blocks until current transition completes)
  - Then proceed with voice transition
Recovery: Automatic queuing via waitForNoTransition
Prevention: Disable UI buttons during transition

[ErrorScenario RapidTextVoiceTextSwitching]
Workflows: Mode Switching
Symptoms: User switches voice → immediately back to text
Must handle:
  - Each transition waits for previous to complete
  - Transitions run in sequence
Recovery: Automatic via waitForNoTransition
Prevention: None needed (working as designed)

### Resource Cleanup Errors

[ErrorScenario AudioStreamCleanupFailed]
Workflows: Voice, Mode Switching
Symptoms: stopAllAudioStreams throws error
Must handle:
  - Save error to console
  - Continue with cleanup
  - Proceed to idle state
Recovery: Best-effort cleanup, may leak MediaStream tracks
Prevention: Try-catch around stopAllAudioStreams

[ErrorScenario WaiterCleanupOnNewSession]
Workflows: Text, Voice
Symptoms: Stale waiters from previous session can resolve/reject at wrong time
Must handle:
  - Reject stale waiters when starting new session
  - Clear waiter arrays before new session
Recovery: Automatic cleanup
Prevention: Clear waiters at session start

[ErrorScenario TranscriptStreamCreationFailed]
Workflows: Voice
Symptoms: startStream callback fails
Must handle:
  - Save error to console
  - Set voice stream initialized ref: no
  - Continue voice session (don't disconnect)
Recovery: Voice session continues without transcript persistence
Prevention: Validate conversationId before calling startStream

### Cross-Tab Coordination Errors

[ErrorScenario StaleLockFromCrashedTab]
Workflows: Cross-Tab, Voice
Symptoms: Lock exists but timestamp older than 30 seconds
Must handle:
  - Detect staleness (timestamp check)
  - Clear stale lock from localStorage
  - Proceed with session start
Recovery: Automatic cleanup on next session start
Prevention: Heartbeat system, staleness detection

[ErrorScenario ForceStopUnresponsiveTab]
Workflows: Cross-Tab, Voice
Symptoms: Other tab doesn't respond to FORCE_STOP_VOICE within 300 ms
Must handle:
  - Wait 300 ms
  - Proceed with voice start anyway
  - Overwrite session lock
Recovery: New tab takes over, old tab's lock becomes invalid
Prevention: Reasonable timeout (300 ms)

[ErrorScenario RapidTabClosing]
Workflows: Cross-Tab
Symptoms: Tab closed before SESSION_ENDED broadcasted
Must handle:
  - Other tabs rely on heartbeat timeout
  - After 30 seconds without heartbeat: Lock becomes stale
  - Next tab to start voice will clear stale lock
Recovery: Automatic cleanup via staleness detection
Prevention: Unmount effect sends SESSION_ENDED (best effort)

[ErrorScenario BroadcastChannelUnavailable]
Workflows: Cross-Tab
Symptoms: Browser doesn't support BroadcastChannel
Must handle:
  - Create null channel (graceful degradation)
  - Use session lock only for coordination
  - Show warning to console
Recovery: Single-tab usage still works, multi-tab coordination degraded
Prevention: Feature detection

### Mode Switching Errors

[ErrorScenario VoiceStartFailsDuringTextToVoice]
Workflows: Mode Switching
Symptoms: Voice connection fails after text stopped
Must handle:
  - Text already stopped
  - Voice start failed
  - Mode: idle
  - User must retry
Recovery: User must manually retry
Prevention: Retry logic in voice start (2 attempts)

[ErrorScenario TextStopTimeoutDuringVoiceSwitch]
Workflows: Mode Switching
Symptoms: Fast-stop text times out after 2 seconds
Must handle:
  - Show warning
  - Continue with voice start anyway
  - Voice start may handle any remaining text cleanup
Recovery: Proceed with voice start (best effort)
Prevention: Short timeout (2s), acceptable risk

[ErrorScenario TransitionAbandonedDueToUnmount]
Workflows: Mode Switching
Symptoms: Component unmounts during transition
Must handle:
  - is unmounting ref: yes
  - Stop all ongoing operations
  - Clean up all resources immediately
  - Do not update state (component gone)
Recovery: Cleanup in unmount effect
Prevention: Check isUnmountingRef before state updates

### Application-Specific Errors

[ErrorScenario HistoryNotAppliedOnFirstStart]
Workflows: Text
Symptoms: Conversation history was passed but text dynamic vars applied ref: no
Must handle:
  - Detect condition: conversation history provided and not applied
  - Set text connection state ref: idle
  - Call endSession
  - Wait for disconnect
  - Restart session with dynamic variables
Recovery: Automatic restart
Prevention: Wait up to 1 second for pending history before auto-start

[ErrorScenario DailyLimitReached]
Workflows: Text
Symptoms: ElevenLabs API returns daily limit error
Must handle:
  - Detect error code: 1008 or reason contains "daily limit"
  - Emit to text error handlers
  - Show error to user
  - Stop session
Recovery: User must wait until daily limit resets
Prevention: Usage monitoring, warnings

## Testing Checklist

Per invariant:
  - [ ] Write test case that verifies invariant holds
  - [ ] Write test case that intentionally violates invariant (if safe)
  - [ ] Verify monitoring alert triggers on violation

Per error scenario:
  - [ ] Write test case that triggers error
  - [ ] Verify error handled correctly
  - [ ] Verify recovery mechanism works
  - [ ] Check for resource leaks after error

Overall system:
  - [ ] All invariants tested in isolation
  - [ ] All error scenarios tested
  - [ ] Stress test: Rapid mode switching (10x in 10 seconds)
  - [ ] Load test: Long-running session (1 hour+)
  - [ ] Multi-tab test: 3 tabs, various scenarios
  - [ ] Network disruption: Disconnect during operations
  - [ ] Resource leak test: Monitor memory over time

## Monitoring Setup

Critical alerts (P0 - immediate action):
  - Multiple voice locks detected (duplicate billing)
  - Audio detected in text mode (incorrect billing)
  - Voice session without lock (orphaned session)
  - Transition exceeds 10 seconds (stuck state)

Warning alerts (P1 - investigate soon):
  - Stale disconnect ignored count increasing (may indicate issue)
  - Waiter cleanup triggered (may indicate race condition)
  - Audio stream cleanup failed (privacy risk)
  - Heartbeat missed (potential lock staleness)

Info metrics (P2 - track trends):
  - Mode switch latency (track vs SLO)
  - Session duration (text and voice)
  - Error rate by type
  - Queue depth over time
  - Lock acquisition latency

## Debug Procedures

When invariant violated:
  1. Identify which invariant from console logs or monitoring
  2. Check recent state transitions (mode switches, connections)
  3. Review error logs for related failures
  4. Check resource state (connections, timers, locks)
  5. Verify event handler sequence (especially onConnect/onDisconnect)
  6. Look for stale events (delayed disconnects, duplicate connects)

When error scenario occurs:
  1. Identify scenario from error message
  2. Check if handled correctly (recovery mechanism)
  3. Verify resources cleaned up
  4. Check if monitoring alerted
  5. Review recent user actions (rapid clicking, mode switches)
  6. Check network logs (timeouts, failures)

Common debug patterns:
  - State inconsistency: Check ref vs state synchronization
  - Stale events: Check connection state ref guards
  - Resource leaks: Audit cleanup in all exit paths
  - Race conditions: Verify single-flight enforcement
  - Cross-tab issues: Check localStorage and BroadcastChannel logs

## Known Bug Summary

All known bugs from implementation:

1. **Stale disconnect events** (Text) - MITIGATED
   - Location: Lines 777-783
   - Risk: Medium
   - Mitigation: textConnectionStateRef guard

2. **Pending history application timing** (Text) - MITIGATED
   - Location: Lines 1086-1104, 1149-1159
   - Risk: Low (UX impact only)
   - Mitigation: Restart session if needed

3. **Concurrent startText calls** (Text) - MITIGATED
   - Location: Lines 1009-1018
   - Risk: Low
   - Mitigation: isTextStartingRef guard

4. **Waiter cleanup** (Text, Voice) - PARTIALLY MITIGATED
   - Location: Lines 94-114, 1230-1231, 1267
   - Risk: Low
   - Mitigation: Clear stale waiters on new session start

5. **Mode ref synchronization** (All) - KNOWN LIMITATION
   - Location: Lines 343-349, throughout
   - Risk: Low (brief desync only)
   - Mitigation: Update ref in useEffect

6. **Audio stream cleanup** (Voice, Mode Switching) - MITIGATED
   - Location: Lines 916-921, 964-969, 978-991
   - Risk: Medium (privacy)
   - Mitigation: Multiple cleanup points

7. **Cross-tab lock staleness** (Cross-Tab) - MITIGATED
   - Location: Lines 486-498, 1202-1216
   - Risk: Low
   - Mitigation: 30-second staleness check, heartbeat

## Performance SLOs (Summary)

Text mode:
  - Start: <2 seconds
  - Stop: <1 second
  - Message send: <100 ms

Voice mode:
  - Start: <3 seconds (includes retry)
  - Stop: <1 second
  - Force stop latency: <300 ms

Mode switching:
  - Idle → Text: <2 seconds
  - Idle → Voice: <3 seconds
  - Text ↔ Voice: <500 ms (critical UX)

Cross-tab:
  - Message delivery: <100 ms
  - Lock read/write: <10 ms
  - Staleness check: <1 ms

## Compliance Requirements

Billing accuracy:
  - [ ] No audio charges in text mode (CRITICAL)
  - [ ] No duplicate voice sessions (CRITICAL)
  - [ ] Session duration accurate (CRITICAL)

Privacy:
  - [ ] Microphone released on voice end (CRITICAL)
  - [ ] No audio leaks in text mode (CRITICAL)
  - [ ] User consent for voice mode (REQUIRED)

Resource management:
  - [ ] All connections cleaned up (REQUIRED)
  - [ ] All timers cleared (REQUIRED)
  - [ ] All waiters resolved/rejected (REQUIRED)
  - [ ] All locks released (REQUIRED)

UX requirements:
  - [ ] Mode switches <500 ms (TARGET)
  - [ ] No stuck "transitioning" state (CRITICAL)
  - [ ] Clear error messages (REQUIRED)
  - [ ] Cross-tab coordination working (REQUIRED)

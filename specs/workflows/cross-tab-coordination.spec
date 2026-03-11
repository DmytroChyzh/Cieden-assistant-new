# Cross-Tab Coordination Workflow
# Version: 1.0
# Last updated: 2025-01-25

[Workflow CrossTabCoordination]
Version: 1.0
Description: Coordinates ElevenLabs sessions across multiple browser tabs to prevent duplicate voice sessions
Performance tier: 2

## Overview

Purpose: Ensure only one voice session active across all tabs while allowing concurrent text sessions.

Critical requirements:
  - Single voice session globally (enforced via session lock)
  - Multiple text sessions allowed (no lock needed)
  - Heartbeat system prevents stale locks
  - Force takeover for unresponsive tabs
  - Graceful degradation if BroadcastChannel unavailable

## Actors

  - current_tab (this tab)
  - other_tabs (sibling tabs in same browser)
  - localStorage (shared storage)
  - broadcast_channel (cross-tab messaging)

## Resources

[Resource BroadcastChannel]
Created when: Provider component mounts
Cleaned up when: Component unmounts
Must not leak: Verify closed on unmount
Why important: Cross-tab messaging, uses memory
Channel name: 'elevenlabs_session'

[Resource SessionLock]
Created when: Voice session connects successfully
Cleaned up when:
  - Voice session disconnects
  - Component unmounts (if owned by this tab)
  - Stale timeout (30 seconds without heartbeat)
  - Force takeover by another tab
Must not leak: Verify cleared within 1 second of voice disconnect
Why important: Prevents duplicate voice sessions (duplicate billing)
Storage: localStorage.elevenlabs_session_lock
Structure: {conversationId, mode, tabId, timestamp}

[Resource HeartbeatTimer]
Created when: Session mode becomes text or voice
Cleaned up when: Session mode becomes idle or component unmounts
Must not leak: Verify cleared when session ends
Why important: Keeps lock fresh, broadcasts liveness
Interval: 10 seconds

## States

List: [monitoring, session_starting, session_active, session_ending, forced_stop]
Terminal: [monitoring]

State descriptions:
  monitoring: Listening for cross-tab messages, no local session
  session_starting: This tab starting a session
  session_active: This tab has active session (text or voice)
  session_ending: This tab ending session
  forced_stop: Another tab forcing this tab to stop voice

## State Data

Per state:
  monitoring:
    - Is other tab active: yes/no
    - Other tab mode: text/voice/none
    - Tab ID: unique identifier
    - Session lock: may exist from other tab or stale

  session_starting:
    - Session mode: transitioning to text or voice
    - Broadcast channel: ready to send

  session_active:
    - Session mode: text or voice
    - Session lock: owned by this tab (if voice)
    - Heartbeat timer: active
    - Is other tab active: may be yes (other tabs have text)

  session_ending:
    - Session mode: transitioning to idle
    - Broadcast channel: ready to send SESSION_ENDED

  forced_stop:
    - Received FORCE_STOP_VOICE message
    - New owner tab ID: from message

## Transitions

[Transition Initialize]
From: [none]
To: monitoring
Triggered by: Provider component mounts

Steps:
  - Create unique tab ID
  - Create broadcast channel
  - Read existing session lock from localStorage
  - If lock exists:
    - If lock timestamp older than 30 seconds:
      - Save to console: "Cleaning up stale session lock"
      - Clear lock
    - If lock timestamp fresh:
      - Save to console: "Existing session found in another tab"
      - Set is other tab active: yes
      - Set other tab mode: lock.mode
  - Register message listener on broadcast channel

State after transition:
  Tab ID: created
  Broadcast channel: active and listening
  Is other tab active: yes/no based on lock check

[Transition StartTextSession]
From: [monitoring, session_active]
To: session_active
Triggered by: This tab starts text session

Steps:
  - Set session mode: text
  - Do NOT acquire session lock (text sessions are concurrent)
  - Do NOT broadcast SESSION_STARTED (text sessions don't block others)
  - Create heartbeat timer (for general liveness)

State after transition:
  Session mode: text
  Heartbeat timer: active
  Session lock: not created

Why no lock: Text sessions can run concurrently across tabs without conflicts

[Transition StartVoiceSession]
From: [monitoring]
To: session_starting → session_active
Triggered by: This tab starts voice session

Execution flow (sequential stages):

  [Stage 1: Check for existing lock]
  Steps:
    - Read session lock from localStorage
    - If lock exists and mode: voice and timestamp fresh and not owned by this tab:
      - Go to force takeover flow
    - If lock exists and stale:
      - Clear lock

  State after Stage 1:
    Lock: cleared if stale or preparing for takeover

  Outcomes:
    No lock → Continue to Stage 3
    Stale lock → Clear and continue to Stage 3
    Fresh lock from other tab → Continue to Stage 2 (force takeover)

  [Stage 2: Force takeover (if needed)]
  Execute if: Fresh lock exists from another tab

  Steps:
    - Broadcast FORCE_STOP_VOICE message with (newOwner: this tab ID)
    - Wait 300 ms for other tab to stop
    - Save to console: "Forcing previous voice session to stop"

  Timeout: 300 ms
  On timeout:
    - Proceed to Stage 3 (other tab unresponsive, will overwrite lock)

  State after Stage 2:
    Wait: 300 ms completed
    Other tab: notified or unresponsive

  Outcomes:
    Other tab stopped → Continue to Stage 3
    Other tab unresponsive → Continue to Stage 3 (overwrite)

  [Stage 3: Voice connection succeeds]
  Triggered by: Voice WebRTC connection established

  Steps:
    - Create session state: {conversationId, mode: voice, tabId, timestamp: Date.now()}
    - Call SessionLock.set(session state)
    - Save to console: "Acquired session lock for voice mode"
    - Broadcast SESSION_STARTED message with session state
    - Create heartbeat timer

  State after Stage 3:
    Session lock: owned by this tab
    Broadcast: SESSION_STARTED sent
    Heartbeat timer: active
    Session mode: voice

  Outcomes:
    Success → Transition to session_active state

Invariant checks:
  - After Stage 3: Session lock exists and owned by this tab
  - After Stage 3: Heartbeat timer active

[Transition ReceiveForceStop]
From: [session_active]
To: forced_stop → session_ending
Triggered by: Received FORCE_STOP_VOICE message via broadcast channel

Execute if:
  Session mode ref: voice
  This tab ID not equal to new owner ID

Steps:
  - Save to console: "Voice session force stopped by another tab"
  - Call stopVoice
  - Transition to session_ending

State after transition:
  Session mode: transitioning to idle
  Session lock: will be cleared in stopVoice

[Transition SendHeartbeat]
From: [session_active]
To: session_active (stay in same state)
Triggered by: Heartbeat timer fires (every 10 seconds)

Execute if: Session mode: text or voice

Steps:
  - If session mode: voice:
    - Update session lock heartbeat timestamp
  - Broadcast SESSION_HEARTBEAT message with (conversationId, mode, tabId, timestamp)

On error:
  - Save to console
  - Continue (best effort)

State after transition:
  Session lock timestamp: updated (if voice)
  Broadcast: heartbeat sent

[Transition EndSession]
From: [session_active]
To: session_ending → monitoring
Triggered by:
  - User explicitly stops session
  - Session timeout
  - Mode switch

Steps:
  - If session lock owned by this tab:
    - Clear session lock
    - Save to console: "Cleared session lock"
  - Broadcast SESSION_ENDED message with (tabId, conversationId, mode: none, timestamp)
  - Clear heartbeat timer
  - Set is other tab active: no (will be updated if other tabs send heartbeats)
  - Set other tab mode: none

State after transition:
  Session lock: cleared
  Heartbeat timer: cleared
  Broadcast: SESSION_ENDED sent
  Session mode: idle

[Transition ReceiveSessionStarted]
From: [monitoring, session_active]
To: same state
Triggered by: Received SESSION_STARTED message from another tab

Execute if: Message tab ID not equal to this tab ID

Steps:
  - Set is other tab active: yes
  - Set other tab mode: message.mode
  - Save to console: "Another tab started {mode} session"

State after transition:
  Is other tab active: yes
  Other tab mode: from message

[Transition ReceiveSessionEnded]
From: [monitoring, session_active]
To: same state
Triggered by: Received SESSION_ENDED message from another tab

Execute if: Message tab ID not equal to this tab ID

Steps:
  - Set is other tab active: no
  - Set other tab mode: none
  - Save to console: "Other tab ended session"

State after transition:
  Is other tab active: no
  Other tab mode: none

[Transition ReceiveHeartbeat]
From: [monitoring, session_active]
To: same state
Triggered by: Received SESSION_HEARTBEAT message from another tab

Execute if: Message tab ID not equal to this tab ID

Steps:
  - Set is other tab active: yes
  - Set other tab mode: message.mode

State after transition:
  Is other tab active: yes
  Other tab mode: from message

[Transition Cleanup]
From: [any state]
To: none
Triggered by: Component unmounts

Steps:
  - Set is unmounting ref: yes
  - If session lock owned by this tab:
    - Clear session lock
    - Broadcast SESSION_ENDED message
  - Clear heartbeat timer
  - Close broadcast channel

State after transition:
  All resources: cleaned up
  Component: unmounted

## Message Types

[Message SESSION_STARTED]
Sent when: Tab starts a voice session (not sent for text)
Payload:
  conversationId: text
  mode: voice
  tabId: text
  timestamp: number
Purpose: Notify other tabs that voice session active

[Message SESSION_ENDED]
Sent when: Tab ends any session
Payload:
  tabId: text
  conversationId: text
  mode: none
  timestamp: number
Purpose: Notify other tabs that session ended

[Message SESSION_HEARTBEAT]
Sent when: Every 10 seconds while session active
Payload:
  conversationId: text
  mode: text or voice
  tabId: text
  timestamp: number
Purpose: Keep other tabs informed that session still alive

[Message FORCE_STOP_VOICE]
Sent when: Tab wants to start voice but another tab has active voice session
Payload:
  newOwner: text (tab ID of requesting tab)
Purpose: Force other tab to stop voice to allow takeover

[Message CLAIM_SESSION]
Sent when: Tab wants to claim orphaned session (currently unused)
Payload:
  tabId: text
Purpose: Notify other tabs of claim attempt

## Session Lock Structure

Storage: localStorage.elevenlabs_session_lock

Format:
  conversationId: text (conversation ID)
  mode: text or voice
  tabId: text (unique tab identifier)
  timestamp: number (milliseconds since epoch)

Operations:
  SessionLock.set(state): Save to localStorage
  SessionLock.get(): Read from localStorage
  SessionLock.clear(): Remove from localStorage
  SessionLock.updateHeartbeat(tabId): Update timestamp only (for heartbeats)

Staleness check:
  isSessionStale(lock): Check if (Date.now() - lock.timestamp) > 30000 ms

## Invariants

[Invariant AtMostOneVoiceLock]
Check: At most one non-stale session lock with mode: voice exists in localStorage
Impact if violated: Multiple tabs can start voice (duplicate billing)

[Invariant LockOwnershipMatchesSession]
Check: If this tab has voice session active then session lock owned by this tab
Impact if violated: Orphaned voice session, other tabs can't start

[Invariant HeartbeatKeepsLockFresh]
Check: If voice session active then lock timestamp updated within 10 seconds
Impact if violated: Lock becomes stale, other tabs can take over

[Invariant BroadcastChannelClosedOnUnmount]
Check: Broadcast channel closed when component unmounts
Impact if violated: Memory leak, orphaned listeners

[Invariant IgnoreOwnMessages]
Check: Messages from this tab ID are ignored
Impact if violated: Infinite message loops, confused state

[Invariant TextSessionsNoLock]
Check: Text sessions do not create or update session locks
Impact if violated: Text sessions would block each other unnecessarily

## Error Scenarios

[ErrorScenario BroadcastChannelUnavailable]
Starting state: mounting
Trigger: Browser doesn't support BroadcastChannel

Must handle:
  - Create null channel (graceful degradation)
  - Use session lock only for coordination
  - Show warning to console

Recovery: Single-tab usage still works, multi-tab coordination degraded

[ErrorScenario StaleLockFromCrashedTab]
Starting state: monitoring
Trigger: Lock exists with timestamp older than 30 seconds

Must handle:
  - Detect staleness (timestamp check)
  - Clear stale lock
  - Proceed with session start

Recovery: Automatic cleanup on next session start

[ErrorScenario ForceStopUnresponsiveTab]
Starting state: session_starting
Trigger: Other tab doesn't respond to FORCE_STOP_VOICE within 300 ms

Must handle:
  - Wait 300 ms
  - Proceed with voice start anyway
  - Overwrite session lock

Recovery: New tab takes over, old tab's lock becomes invalid

[ErrorScenario RapidTabClosing]
Starting state: session_active
Trigger: Tab closed before SESSION_ENDED broadcasted

Must handle:
  - Other tabs rely on heartbeat timeout
  - After 30 seconds without heartbeat: Lock becomes stale
  - Next tab to start voice will clear stale lock

Recovery: Automatic cleanup via staleness detection

[ErrorScenario ClockSkewBetweenTabs]
Starting state: any
Trigger: System clock changed between tabs

Must handle:
  - Use relative time for timeouts (not absolute)
  - Heartbeat interval is relative (10 seconds)
  - Staleness check uses delta (30 seconds)

Mitigation: Relative time deltas minimize clock skew impact

## Performance Requirements

SLO:
  - Message delivery: <100 ms (BroadcastChannel)
  - Lock read/write: <10 ms (localStorage)
  - Staleness check: <1 ms
  - Force stop wait: 300 ms

Observability events:
  - tab_created: unique ID generated
  - lock_acquired: session lock set
  - lock_cleared: session lock removed
  - heartbeat_sent: heartbeat broadcast
  - message_received: cross-tab message
  - stale_lock_detected: cleanup needed
  - force_stop_sent: takeover initiated

## Testing Strategy

Critical test cases:
  1. Single tab session lifecycle
  2. Two tabs: start voice in tab A, try to start in tab B (should be blocked)
  3. Two tabs: start voice in tab A, force takeover from tab B
  4. Stale lock cleanup (simulate 30+ second old lock)
  5. Tab crash recovery (lock not cleared, detected as stale)
  6. Heartbeat keeps lock fresh
  7. Multiple tabs with text sessions (all allowed)
  8. Force stop timeout (unresponsive tab)
  9. SESSION_ENDED broadcast on tab close
  10. BroadcastChannel unavailable fallback

Manual testing:
  - Open 2-3 tabs simultaneously
  - Check localStorage.elevenlabs_session_lock
  - Monitor console logs for cross-tab messages
  - Simulate tab crash (close without cleanup)
  - Test force takeover by starting voice in multiple tabs

Performance testing:
  - Measure lock read/write latency
  - Measure message delivery time
  - Verify heartbeat interval accuracy
  - Check for memory leaks (listeners, timers)

## Known Issues & Risks

Issue 1: BroadcastChannel not supported in all browsers
Mitigation: Fallback to lock-only coordination
Risk: Degraded multi-tab experience

Issue 2: localStorage quota exceeded
Mitigation: Lock is small (< 200 bytes)
Risk: Lock write may fail

Issue 3: Force stop timeout too short
Location: 300 ms wait
Symptom: Slow tab doesn't stop in time
Risk: Brief period with duplicate voice sessions
Mitigation: New lock overwrites old, old tab detects invalid lock

Issue 4: Heartbeat interval vs staleness window
Current: 10 second heartbeat, 30 second stale window
Risk: 3 missed heartbeats needed to mark stale
Mitigation: 3x safety margin is reasonable

Issue 5: System clock changes
Symptom: Clock set backward/forward affects timestamps
Risk: Staleness detection may be inaccurate
Mitigation: Use relative deltas, minimize impact

## Why Text Sessions Don't Need Lock

Reasoning:
  - Text sessions use WebSocket, not persistent audio resources
  - Multiple text sessions don't cause duplicate billing
  - Each text session is independent
  - No audio conflicts (microphone/speaker)
  - Concurrent text sessions enhance UX (user can work in multiple tabs)

Trade-offs:
  - Pro: Better UX, no blocking
  - Pro: Simpler implementation (no lock management for text)
  - Con: Multiple text sessions may cause confusion if user forgets which tab is active
  - Mitigation: UI shows "Active in another tab" for voice only

## Why Voice Sessions Need Lock

Reasoning:
  - Voice uses WebRTC, requires microphone access
  - Only one microphone stream can be active at a time
  - Multiple voice sessions cause:
    - Duplicate audio billing
    - Microphone conflicts
    - Confused user experience (which tab is listening?)
  - Session lock enforces single voice session globally

Trade-offs:
  - Pro: Prevents duplicate billing
  - Pro: Clear UX (only one tab has microphone)
  - Pro: No resource conflicts
  - Con: More complex (lock management, heartbeats, force stop)
  - Mitigation: Complexity encapsulated in this workflow

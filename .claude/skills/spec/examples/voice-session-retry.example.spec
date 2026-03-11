# Example: Voice Session with Retry (Tier 2)
# Demonstrates compact spec with mandatory enforcement

[Process VoiceSessionRetry]
Version: 1.0
Description: Voice session with reconnect and cross-tab coordination
Performance tier: 2

# Tier Assignment: retry (2) + callbacks (2) + cross-tab (1) + mode (1) = 6 → Tier 2

Actors:
  - user
  - elevenlabs_sdk
  - session_manager

Resources:
  [Resource VoiceWebRTC]
  Created when: User starts voice
  Cleaned up when:
    - Success: User stops, transition to idle
    - Failure: Connection timeout, transition to failed
    - Cancel: User switches mode, transition to idle
    - Timeout: 15 seconds, transition to failed
  Must not leak: Within 30 seconds
  Cost: Per-minute billing

  [Resource SessionLock]
  Created when: After VoiceWebRTC: connected (not before)
  Cleaned up when:
    - All exits: idle, failed, stopped
  Depends on: VoiceWebRTC
  Must not leak: Within 2 seconds

States:
  List: [idle, starting, active, retrying, failed]
  Terminal: [idle, failed]

Transitions:
  [Transition Start voice]
  From: [idle]
  To: starting
  Steps:
    - Set mode: starting
    - Set attemptId: 1
    - Call SDK.startVoice
    - Wait for: onConnect
  Timeout: 10 seconds
  On timeout:
    - Clear VoiceWebRTC
    - Set mode: failed

  [Transition Connect success]
  From: [starting, retrying]
  To: active
  Triggered by: onConnect (attemptId matches)
  Steps:
    - Set mode: active
    - Create SessionLock
    - Clear retry timer

  [Transition Retry]
  From: [starting, active]
  To: retrying
  Triggered by: onDisconnect (network error)
  Steps:
    - Set mode: starting (reassertion)
    - Set attemptId: increment
    - Clear failed resources
    - Clear stale timers
    - Wait 2 seconds
    - Call SDK.startVoice
  Timeout: 10 seconds
  On timeout:
    - Set mode: failed

# Mandatory Enforcement (Tier 2)

[GEM: Guarded Event Matrix]
# Only top callbacks documented; full matrix in validation-workflow.md

Callback: onConnect
  Allowed phases: starting, retrying
  Guard: phase_guard + attempt_guard
  Check: event.attemptId equals STATE.attemptId
  Permitted: Set mode: active, Create SessionLock
  Forbidden: Do not Set mode: idle during retrying
  Invariant: If VoiceWebRTC: connected → mode: active

Callback: onDisconnect
  Allowed phases: starting, active, retrying
  Guard: phase_guard + attempt_guard
  Check: event.attemptId equals STATE.attemptId
  Permitted: Clear SessionLock, Set mode: failed or retrying
  Forbidden: Do not Set mode: idle during retrying unless attemptId matches
  Invariant: Terminal hygiene (no timers if idle)

[Two-Trace: onDisconnect during retry]
# Proves stale events rejected

T1 (starting):
  Step 1: mode: starting, attemptId: 1 | Event: none | State: same | Invariant: ✓
  Step 2: mode: starting, attemptId: 1 | Event: onDisconnect (attempt:1) | Guard: 1=1 ✓ | Mutation: Set failed | State: failed, attempt:1 | Invariant: hygiene ✓

T2 (retrying):
  Step 1: mode: retrying, attemptId: 2 | Event: none | State: same | Invariant: ✓
  Step 2: mode: retrying, attemptId: 2 | Event: onDisconnect (attempt:1) | Guard: 1≠2 ✗ | Mutation: SKIP | State: retrying (unchanged) | Invariant: no demotion ✓

Invariants:
  [Invariant Phase-resource coherence]
  Check: After onConnect callback
  Rule: If VoiceWebRTC: connected → mode: active
  Impact if violated: Billing mismatch, stuck state

  [Invariant Terminal hygiene]
  Check: On entering idle or failed
  Rule: Clear all timers, Clear all listeners, Clear SessionLock
  Impact if violated: Resource leak

Observability:
  Log attemptId on: Start, Retry, onConnect, onDisconnect
  Emit: state_enter, state_exit, timer_start, timer_stop, resource_create, resource_cleanup

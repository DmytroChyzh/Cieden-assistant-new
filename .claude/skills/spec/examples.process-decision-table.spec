[Process ExampleProcess]
Version: 1.0
Description: Example PDT (GEM) with AI-prefilled defaults

# Process Decision Table (PDT) — alias: GEM
# The AI MUST prefill defaults when unknown

Columns:
- Event | Phases | Guard | Permitted updates | Forbidden updates | Resources/Timers | Outcome | Invariants | Budget(ms)/Cut-through

Rows:
- Event: external_status.connected
  Phases: starting
  Guard: phase_guard
  Permitted updates: Set connectionRef: connected; Set STATE.transitioning: no
  Forbidden updates: Do not change top-level mode during retrying
  Resources/Timers: Peer/resource ready; stop connect timer
  Outcome: continue
  Invariants: phase–resource coherence
  Budget(ms)/Cut-through: 5000 / yes

- Event: external_status.disconnected
  Phases: active, stopping
  Guard: phase_guard
  Permitted updates: Clear timers/listeners; release lock
  Forbidden updates: none
  Resources/Timers: Stop all timers; delete transient resources
  Outcome: exit
  Invariants: terminal hygiene
  Budget(ms)/Cut-through: 5000 / yes

- Event: timeout.connect
  Phases: starting, retrying
  Guard: phase_guard
  Permitted updates: Save error details; cleanup partial resources
  Forbidden updates: none
  Resources/Timers: Stop connect timer
  Outcome: continue or exit (document)
  Invariants: terminal reachability within bound
  Budget(ms)/Cut-through: 5000 / yes

# Two-trace rule (derived):
# T1: event during starting; T2: event during retrying
# At each step, checkpoint state and run the listed invariant



# Parallel Validation Execution Guide

## Quick Answer: Yes, We Can Parallelize!

**Sequential execution**: ~20-30 minutes (all 7 lanes one-by-one)
**Parallel execution**: ~8-10 minutes (3 batches with parallel lanes)

---

## Dependency Graph

```
Stage 2: Generate Checklist
    ↓
┌───┴─────┬─────────┬─────────┬─────────┐
│         │         │         │         │
Lane 1    Lane 2    Lane 4    Lane 6    (BATCH 1 - Run in parallel)
State     GEM       Resources Cross-tab
Matrix
│         │
│         ├─────────────────┐
│         ↓                 ↓
│         Lane 3            Lane 7      (BATCH 2 - After Batch 1)
│         Traces            Performance
│         (needs GEM)       (needs State Matrix)
│         │
│         ↓
│         Lane 5                        (BATCH 3 - After Batch 2)
│         Invariants
│         (needs Traces)
│
└─────────┴─────────────────────────────→ Stage 4: Integration
```

## Batch Execution Strategy

### Batch 1 (4 lanes in parallel) - ~3-5 min
**Independent lanes** (no dependencies):
- Lane 1: State Transition Matrix
- Lane 2: Guarded Event Matrix (GEM)
- Lane 4: Resource Cleanup Matrix
- Lane 6: Cross-Tab Lock Rules

**Launch all 4 simultaneously** - they each get the same inputs (spec + checklist).

### Batch 2 (2 lanes in parallel) - ~5-8 min
**Dependent lanes** (need Batch 1 outputs):
- Lane 3: Trace Executor (needs Lane 2 GEM output)
- Lane 7: Performance Budget (needs Lane 1 State Matrix output)

**Launch both simultaneously** - each gets their dependency output.

### Batch 3 (1 lane) - ~3-4 min
**Heavily dependent lane**:
- Lane 5: Invariant Validator (needs Lane 3 Trace output)

**Launch after Batch 2** completes.

---

## Context Budget Per Lane

| Lane | Input Size | Components |
|------|-----------|------------|
| **Batch 1 Lanes** | ~1500-2000 tokens each | Spec text + Checklist section + Template + Criteria |
| Lane 1 | 1500 tokens | Spec + States/Transitions from checklist + Matrix template |
| Lane 2 | 1500 tokens | Spec + Callbacks from checklist + GEM template |
| Lane 4 | 1500 tokens | Spec + Resources from checklist + Cleanup template |
| Lane 6 | 1500 tokens | Spec + Ownership rules from checklist + Lock template |
| **Batch 2 Lanes** | ~2000-2500 tokens each | Spec + Checklist + Batch 1 output + Template |
| Lane 3 | 2000-2500 tokens | Spec + GEM output (Lane 2) + Trace template |
| Lane 7 | 1500-2000 tokens | Spec + State Matrix (Lane 1) + Budget template |
| **Batch 3 Lanes** | ~2000-2500 tokens | Spec + Checklist + Batch 2 output + Template |
| Lane 5 | 2000-2500 tokens | Spec + Checklist invariants + Trace tables (Lane 3) + Proof template |

**Total context across all lanes**: ~11,500-14,500 tokens
**vs. Single agent**: Would need all 7000 tokens of validation-workflow.md upfront

---

## Concrete Example: Launching Batch 1

When you detect a Tier 2 spec, here's exactly what you do:

### Step 1: Generate Stage 2 Checklist
```markdown
I've detected Tier 2 triggers (retry, session, onConnect, onDisconnect).

Generating validation checklist...

[Validation Checklist]
States: idle, starting, active, retrying, failed
Callbacks: onConnect, onDisconnect, onStatusChange
Resources: VoiceWebRTC, SessionLock
Invariants: Phase-resource coherence, Terminal hygiene
...
```

### Step 2: Launch Batch 1 (4 Parallel Agents)
```markdown
Launching Batch 1 validation (4 lanes in parallel)...
```

**Single message with 4 Task calls**:

```typescript
// This is what you send in ONE message:
[
  Task({
    subagent_type: "general-purpose",
    description: "Validate state transitions",
    prompt: `You are validating the state machine for this specification:

[FULL SPEC TEXT - ~800 tokens]

From the checklist, these states and transitions were identified:
- States: idle, starting, active, retrying, failed
- Terminal: idle, failed

Your ONLY task: Fill this State Transition Matrix

| From State | Event/Condition | To State | Timeout? | Timeout Value | Timeout Path | Cleanup Steps |
|------------|-----------------|----------|----------|---------------|--------------|---------------|
| ??? | ??? | ??? | ??? | ??? | ??? | ??? |

Pass criteria (you MUST verify):
✓ Every "Wait for" has a row with Timeout: Yes
✓ Every timeout has Value and Timeout Path filled
✓ Terminal states have complete Cleanup Steps
✓ No ambiguous triggers (same event from same state → one outcome)

Common pitfalls:
- Missing timeout rows for "Wait for" steps
- Incomplete cleanup in terminal states
- Ambiguous event triggers

Output ONLY: The completed matrix in markdown table format.`
  }),

  Task({
    subagent_type: "general-purpose",
    description: "Validate callback guards (GEM)",
    prompt: `You are validating callback guards for this specification:

[FULL SPEC TEXT - ~800 tokens]

From the checklist, these callbacks were identified:
- onConnect: phase_guard + attempt_guard
- onDisconnect: phase_guard + attempt_guard
- onStatusChange: phase_guard

Tier: 2

Your ONLY task: Fill this Guarded Event Matrix (GEM)

| Callback | Allowed Phases | Guard Type | Permitted Updates | Forbidden Updates | Outcome | Invariants | Budget(ms) | Cut-through |
|----------|---------------|------------|-------------------|-------------------|---------|------------|------------|-------------|
| ??? | ??? | ??? | ??? | ??? | ??? | ??? | ??? | ??? |

Pass criteria for Tier 2 (you MUST verify):
✓ Every callback has a row
✓ Guard Type includes "attempt_guard" for callbacks during retry
✓ Forbidden Updates includes "Do not Set mode: idle during retrying"
✓ Invariants column lists phase-resource checks

Common pitfalls:
- Missing attempt_guard for onConnect/onDisconnect
- Allowing mode demotion without guard check
- Not listing invariants to check

Output ONLY: The completed GEM in markdown table format.`
  }),

  Task({
    subagent_type: "general-purpose",
    description: "Validate resource cleanup",
    prompt: `You are validating resource cleanup for this specification:

[FULL SPEC TEXT - ~800 tokens]

From the checklist, these resources were identified:
- VoiceWebRTC: Created when Starting, Must cleanup in: success/failure/cancel/timeout
- SessionLock: Created when After connect, Depends on: VoiceWebRTC

Your ONLY task: Fill this Resource Cleanup Matrix

| Resource | Created When | Cleanup: Success | Cleanup: Failure | Cleanup: Cancel | Cleanup: Timeout | Depends On | Must Not Leak |
|----------|--------------|------------------|------------------|-----------------|------------------|------------|---------------|
| ??? | ??? | ??? | ??? | ??? | ??? | ??? | ??? |

Pass criteria (you MUST verify):
✓ Every resource has cleanup in ALL 4 outcomes
✓ Dependency order respected (child cleaned before parent)
✓ "Must Not Leak" has time bound (e.g., "Within 30s")
✓ No undefined outcome paths

Common pitfalls:
- Missing cleanup for cancel/timeout outcomes
- Wrong dependency order (parent before child)
- Vague leak bounds

Output ONLY: The completed matrix in markdown table format.`
  }),

  Task({
    subagent_type: "general-purpose",
    description: "Validate cross-tab locks",
    prompt: `You are validating session lock rules for this specification:

[FULL SPEC TEXT - ~800 tokens]

From the checklist, these ownership rules were identified:
- SessionLock.owner: Set after connect, Clear on all exits, Staleness: 30s, Heartbeat: 10s

Your ONLY task: Fill this Cross-Tab Lock Rules Matrix

| Lock Field | Set When | Cleared When | Staleness Rule | Takeover Rule | Heartbeat Interval | Cleanup on Stale |
|------------|----------|--------------|----------------|---------------|-------------------|------------------|
| ??? | ??? | ??? | ??? | ??? | ??? | ??? |

Pass criteria (you MUST verify):
✓ Lock set AFTER successful connection (not before)
✓ Lock cleared on ALL exit paths (list them all)
✓ Staleness timeout defined (e.g., "30s no heartbeat")
✓ Takeover rules prevent races
✓ Heartbeat interval reasonable (not too frequent/rare)

Common pitfalls:
- Setting lock before connection confirmed
- Missing exit path (e.g., forgot "cancel" case)
- No staleness timeout (orphaned locks never expire)

Output ONLY: The completed matrix in markdown table format.`
  })
]
```

### Step 3: Wait for Batch 1 Results (~3-5 min)

The 4 agents run concurrently. When all complete, you get 4 deliverables:
1. State Transition Matrix (10 rows)
2. GEM (3 callbacks)
3. Resource Cleanup Matrix (2 resources)
4. Cross-Tab Lock Rules (1 lock)

### Step 4: Launch Batch 2 (2 Parallel Agents)

Now you can launch the next batch since you have the dependencies:

```typescript
[
  Task({
    subagent_type: "general-purpose",
    description: "Execute validation traces",
    prompt: `You are executing validation traces for this specification:

[FULL SPEC TEXT - ~800 tokens]

From Lane 2 GEM, these callbacks require traces:
[PASTE GEM OUTPUT FROM BATCH 1 - ~300 tokens]

Callbacks with attempt_guard:
- onConnect (allowed: starting, retrying)
- onDisconnect (allowed: all phases)

Your ONLY task: For EACH callback, produce TWO traces:
- T1: Event firing during "starting" phase
- T2: Event firing during "retrying" phase

Format (for each trace):
[TRACE TABLE TEMPLATE - ~200 tokens]

Pass criteria (you MUST verify):
✓ Two complete traces per guarded callback
✓ State checkpointed in "State Before" column for each step
✓ Guard checks shown with pass/fail (e.g., "attemptId: 1≠2 ✗")
✓ Stale events (mismatched attemptId) show mutation: SKIP
✓ Invariants verified at each step

Critical proof: T2 trace MUST show stale event (prior attemptId) being rejected.

Output ONLY: All trace tables in markdown format.`
  }),

  Task({
    subagent_type: "general-purpose",
    description: "Validate performance budgets",
    prompt: `You are validating performance budgets for this specification:

[FULL SPEC TEXT - ~800 tokens]

From Lane 1, these transitions were identified:
[PASTE STATE MATRIX FROM BATCH 1 - ~400 tokens]

Your ONLY task: Fill this Performance Budget Matrix

[BUDGET TABLE TEMPLATE - ~200 tokens]

Pass criteria (you MUST verify):
✓ Every step on critical path has budget
✓ Cumulative budget tracked (shows total latency)
✓ Timeout behavior defined for all "Wait for" steps
✓ Cut-through cancellation specified (can mode switch preempt?)
✓ Observability events mapped (state_enter, timer_start, etc.)

Output ONLY: The completed matrix in markdown table format.`
  })
]
```

### Step 5: Launch Batch 3 (1 Agent)

After Batch 2 completes (~5-8 min), launch final lane:

```typescript
Task({
  subagent_type: "general-purpose",
  description: "Prove invariants",
  prompt: `You are proving invariants for this specification:

[FULL SPEC TEXT - ~800 tokens]

From the checklist, these invariants were identified:
- Phase-resource coherence
- No demotion during retry
- Terminal hygiene

From Lane 3, these traces are available:
[PASTE TRACE TABLES FROM BATCH 2 - ~800 tokens]

Your ONLY task: Fill this Invariant Proof Matrix

[PROOF TABLE TEMPLATE - ~200 tokens]

Pass criteria (you MUST verify):
✓ Every invariant from checklist has a row
✓ Proof references specific Lane 3 trace (e.g., "T2 onDisconnect step 2")
✓ Violation impact clearly stated
✓ All invariants proven to hold (Holds? = ✓)

Output ONLY: The completed proof matrix in markdown table format.`
})
```

---

## Why This Works

### Context Efficiency
**Single agent approach**:
- Needs full validation-workflow.md (7000 tokens)
- Plus spec (800 tokens)
- Plus checklist (300 tokens)
- **Total**: ~8100 tokens in one context

**Parallel lane approach**:
- Each agent: spec (800) + checklist section (50-100) + template (400) + criteria (300)
- **Per lane**: ~1500-2000 tokens
- **Total across 7 lanes**: ~11,500 tokens distributed across 7 focused contexts

### Thinking Budget Maximization
Each agent has **one job**:
- Lane 1: "Fill this matrix" (not "validate everything")
- Lane 2: "Fill this GEM" (not "check all callbacks")
- Lane 3: "Produce these traces" (not "prove correctness")

**Result**: Agent spends 100% of thinking on its narrow task instead of 14% (1/7).

### Error Isolation
If Lane 3 agent makes a mistake:
- **Parallel approach**: Only re-run Lane 3 (5-8 min)
- **Sequential approach**: Re-run entire validation (20-30 min)

---

## Summary: Yes, Absolutely Parallelize!

**Answer to your questions**:

1. **Can checks run in parallel?**
   Yes - 4 lanes in Batch 1, 2 lanes in Batch 2, then 1 in Batch 3.

2. **What context to provide?**
   Each lane gets: spec text + relevant checklist section + template + pass criteria (~1500-2000 tokens).

3. **What task to give each agent?**
   "Your ONLY task: Fill this [specific table]" - one narrow deliverable per agent.

**Time savings**: 20-30 min sequential → 8-10 min parallel (60-70% reduction)

# Session Lifecycle Validation Workflow
**Purpose**: Detailed validation templates for Tier ≥2 specifications with retry/session/callback complexity.
**Load when**: Trigger keywords detected (retry, session, callbacks) OR Tier 2/3 assigned.

---

## Stage 1: Tier Assignment

### Scoring Rubric
| Factor | 0 | 1 | 2 |
|--------|---|---|---|
| Retry/Reconnect | None | Bounded (1-3) | Unbounded/exponential |
| External Callbacks | None | 1-2 sequential | 3+ interleaving |
| Cross-Tab | Single tab | Simple lock | Heartbeat/takeover |
| Mode Switching | Single mode | Sequential | Dynamic with cleanup |
| Resource Deps | 0-1 | 2-3 simple | 4+ or circular |

**Score → Tier**: 0-2: Tier 1 | 3-6: Tier 2 | 7-10: Tier 3
**Default**: If triggers present → Tier 2 (justify downgrade)

---

## Stage 2: Validation Checklist

Generate before proceeding to validation:

```toml
[Validation Checklist]

Resources to track:
  - [Name: creation → cleanup in: success/failure/cancel/timeout]

Callbacks requiring guards:
  - [Name: guard type (phase_guard + attempt_guard for Tier 2)]

Invariants to check:
  - [Name: check after which callbacks → violation impact]

Traces to execute:
  - [Callback: T1 (starting), T2 (retrying)]

Error scenarios:
  - [Timeout/duplicate/late event/mode switch/cross-tab contention]

Ownership rules:
  - [Lock: set when → clear when → staleness → takeover]
```

---

## Stage 3: Parallel Validation Lanes

### ⚠️ CRITICAL REQUIREMENT: PARALLEL EXECUTION IS MANDATORY

**YOU MUST launch all 7 lanes in parallel** using Task tool with multiple concurrent invocations in a single message. This is NOT optional.

**Why parallel execution is non-negotiable**:
- **Finds 33% more bugs**: Independent agents catch issues manual reviews miss
- **Think-Aloud Protocol**: Each agent MUST write full reasoning with token output (not just think silently)
- **Focused attention**: Narrow scope prevents mental shortcuts and pattern blindness
- **Interaction bugs**: Different agents discover problems at boundaries (e.g., GEM forbids mode change, but Traces don't verify enforcement)

**Token cost vs. Bug cost**: Do NOT optimize for token usage. The cost of one missed P0 bug in production (1 week debugging + user impact) is 10-100x more expensive than running 7 parallel agents (~30K tokens vs ~15K sequential).

**VALIDATION FAILS IF**:
- You execute lanes sequentially (one after another)
- You manually perform analysis instead of launching agents
- You skip any of the 7 lanes in Batches 1-3
- You skip Batch 4 (false positive validation)
- Agents use "I think" without writing full reasoning
- You don't write final results to `/tmp/claude/validation-results.md`

### Orchestration Strategy

**YOU MUST execute validation in 4 parallel batches** (not sequential, not all-at-once):

**Batch 1** (4 lanes in parallel): Lanes 1, 2, 4, 6 - independent, no dependencies
**Batch 2** (2 lanes in parallel): Lanes 3, 7 - depend on Batch 1 outputs
**Batch 3** (1 lane): Lane 5 - depends on Batch 2 output
**Batch 4** (N sub-batches, 5 agents each): False positive validation - depends on Batches 1-3 outputs

**Time savings**: 20-30 min sequential → 10-12 min parallel (50-60% reduction)

**Why batched parallel execution**:
- **Finds 33% more bugs**: Independent agents catch issues manual reviews miss
- **Maximizes thinking budget**: Each agent focuses on one narrow deliverable
- **Prevents context overload**: Specific templates instead of "validate everything"
- **Respects dependencies**: Lane 3 needs GEM from Lane 2, Lane 5 needs Traces from Lane 3

**Dependency Graph**:
```
Stage 2: Checklist
    ↓
Batch 1 (parallel):
├─ Lane 1: State Matrix
├─ Lane 2: GEM
├─ Lane 4: Resources
└─ Lane 6: Cross-Tab
    ↓
Batch 2 (parallel):
├─ Lane 3: Traces (needs Lane 2)
└─ Lane 7: Performance (needs Lane 1)
    ↓
Batch 3:
└─ Lane 5: Invariants (needs Lane 3)
    ↓
Batch 4 (parallel sub-batches, max 5 agents each):
└─ False Positive Validation (needs all bugs from Batches 1-3)
    ↓
Stage 4: Integration & Reporting
```

**Agent Invocation Pattern for Batch 1**:
```javascript
// ✅ CORRECT: Launch Batch 1 (4 lanes) in a single message
Task({
  subagent_type: "general-purpose",
  description: "Validate state transitions",
  prompt: LANE_1_PROMPT
})
Task({
  subagent_type: "general-purpose",
  description: "Validate callback guards",
  prompt: LANE_2_PROMPT
})
Task({
  subagent_type: "general-purpose",
  description: "Validate resource cleanup",
  prompt: LANE_4_PROMPT
})
Task({
  subagent_type: "general-purpose",
  description: "Validate cross-tab locks",
  prompt: LANE_6_PROMPT
})

// Wait for Batch 1 to complete, then launch Batch 2...
// Then wait for Batch 2 to complete, then launch Batch 3...
```

### ❌ ANTI-PATTERNS (What NOT to Do)

**WRONG #1: Sequential Execution**
```javascript
// ❌ DO NOT execute lanes one after another
manuallyAnalyzeStateTransitions()     // Lane 1
manuallyAnalyzeCallbacks()            // Lane 2
manuallyAnalyzeResources()            // Lane 3
// Takes 20-30min and misses 33% of bugs!
```

**WRONG #2: All-At-Once (Ignoring Dependencies)**
```javascript
// ❌ DO NOT launch all 7 lanes immediately
Task({ description: "Lane 1", prompt: "..." })
Task({ description: "Lane 2", prompt: "..." })
Task({ description: "Lane 3", prompt: "..." }) // ❌ NEEDS Lane 2 output!
Task({ description: "Lane 5", prompt: "..." }) // ❌ NEEDS Lane 3 output!
// Lane 3 and 5 will fail due to missing dependencies
```

**WRONG #3: Self-Execution Without Agents**
```
"I'll analyze the state transitions myself..."
"Looking at the callbacks, I think they need guards..."
// ❌ NO! You must launch independent agents with Think-Aloud Protocol
```

**WRONG #4: Silent Thinking in Agents**
```javascript
Task({
  prompt: "Validate GEM. Think about it and return results."
  // ❌ Missing: "CRITICAL: Use Think-Aloud Protocol - write full reasoning"
})
```

**WRONG #5: Token Optimization**
```
"Running 3 batches costs 30K tokens vs 15K for manual, so I'll do it manually"
// ❌ Bug cost >> Token cost. Always run batched parallel agents.
// One missed P0 bug = 1 week debugging = 100x token cost
```

**WRONG #6: Skipping Lanes**
```
"Lanes 1-5 are enough, skipping cross-tab and performance"
// ❌ All 7 lanes are mandatory. Lane 7 found cut-through blocking bug in our session.
```

**WRONG #7: Incomplete Prompts**
```javascript
Task({
  description: "Check GEM",
  prompt: "Validate callbacks"  // ❌ Too vague! Missing spec, checklist, template, criteria
})
```

**WRONG #8: Skipping Batch 4 (False Positive Validation)**
```
"We found 26 bugs, that's enough, let's skip validation"
// ❌ NO! 20-30% are likely false positives
// Implementing false positives wastes more time than validation
// Batch 4 runs in ~2-4 min and prevents wrong fixes
```

### ✅ CORRECT EXECUTION EXAMPLE

**Step 1**: Generate Stage 2 Checklist (done manually by you)

**Step 2**: Launch Batch 1 (4 parallel agents in ONE message):
```javascript
Task({ description: "Validate state transitions", prompt: FULL_LANE_1_PROMPT })
Task({ description: "Validate callback guards", prompt: FULL_LANE_2_PROMPT })
Task({ description: "Validate resource cleanup", prompt: FULL_LANE_4_PROMPT })
Task({ description: "Validate cross-tab locks", prompt: FULL_LANE_6_PROMPT })
```

**Step 3**: Wait for Batch 1 results (~3-5 min)

**Step 4**: Launch Batch 2 (2 parallel agents in ONE message, using Batch 1 outputs):
```javascript
Task({ description: "Execute validation traces", prompt: LANE_3_PROMPT_WITH_GEM_OUTPUT })
Task({ description: "Validate performance budgets", prompt: LANE_7_PROMPT_WITH_STATE_MATRIX })
```

**Step 5**: Wait for Batch 2 results (~5-8 min)

**Step 6**: Launch Batch 3 (1 agent, using Batch 2 output):
```javascript
Task({ description: "Prove invariants", prompt: LANE_5_PROMPT_WITH_TRACE_TABLES })
```

**Step 7**: Wait for Batch 3 result (~3-4 min)

**Step 8**: Compile all bugs from Batches 1-3

**Step 9**: Launch Batch 4 (false positive validation in sub-batches of max 5 agents):
```javascript
// If 26 bugs found, split into sub-batches of 5:
// Sub-batch 4.1 (5 bugs)
Task({ description: "Validate bug P0-1", prompt: BUG_VALIDATION_PROMPT_P0_1 })
Task({ description: "Validate bug P0-2", prompt: BUG_VALIDATION_PROMPT_P0_2 })
Task({ description: "Validate bug P1-1", prompt: BUG_VALIDATION_PROMPT_P1_1 })
Task({ description: "Validate bug P1-2", prompt: BUG_VALIDATION_PROMPT_P1_2 })
Task({ description: "Validate bug P1-3", prompt: BUG_VALIDATION_PROMPT_P1_3 })

// Sub-batch 4.2 (5 bugs) - launch after 4.1 completes
Task({ description: "Validate bug P1-4", prompt: BUG_VALIDATION_PROMPT_P1_4 })
// ... 4 more bugs

// Continue until all bugs validated
```

**Step 10**: Wait for all Batch 4 sub-batches to complete (~2-4 min)

**Step 11**: Compile validated bugs (CONFIRMED | FALSE_POSITIVE | UNCERTAIN)

**Step 12**: Write final results to `/tmp/claude/validation-results.md`

**Total time**: 10-12 minutes (vs 20-30 min sequential)

### Context Provided to Each Lane Agent

**Common context (all lanes)**:
- Original specification text
- Validation checklist from Stage 2
- Trigger keywords detected
- Tier assignment

**Lane-specific context**:
- Deliverable template (table format)
- Pass criteria checklist
- Common pitfalls for this lane

**Estimated complexity per lane**:
| Lane | Complexity | Deliverable | Time Estimate |
|------|------------|-------------|---------------|
| 1: State transitions | Low | Matrix (5-10 rows) | 2-3 min |
| 2: GEM | Medium | Matrix (3-5 callbacks) | 3-5 min |
| 3: Traces | High | 2 traces × 3-5 callbacks = 6-10 tables | 5-8 min |
| 4: Resources | Low | Matrix (2-4 resources) | 2-3 min |
| 5: Invariants | Medium | Proofs (3-5 invariants) | 3-4 min |
| 6: Cross-tab | Low | Lock rules (1-2 locks) | 2 min |
| 7: Performance | Low | Budget table (5-8 steps) | 2-3 min |
| 8: False Positive Filter | Low per bug | CONFIRMED/FALSE_POSITIVE/UNCERTAIN per bug | ~30s per bug |

**Total sequential**: ~20-30 min + validation
**Total parallel (3 batches)**: ~5-8 min (limited by longest lane: traces)
**Total parallel (4 batches)**: ~10-12 min (includes validation sub-batches)

---

## Lane Prompts (Templates)

### Lane 1: State Transition Matrix

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are validating the state machine for this specification:

[SPEC TEXT]

From the checklist, these states and transitions were identified:
[CHECKLIST: States section]

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

Output: The completed matrix in markdown table format.
```

**Context size**: ~1500-2000 tokens (spec + checklist + template)

---

### Lane 2: Callback Guard Validator (GEM)

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are validating callback guards for this specification:

[SPEC TEXT]

From the checklist, these callbacks were identified:
[CHECKLIST: Callbacks section]

Tier: [2/3]

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

Output: The completed GEM in markdown table format.
```

**Context size**: ~1500-2000 tokens

---

### Lane 3: Trace Executor

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are executing validation traces for this specification:

[SPEC TEXT]

From Lane 2 GEM, these callbacks require traces:
[LANE 2 OUTPUT: Callbacks with Guard Type including attempt_guard]

Your ONLY task: For EACH callback, produce TWO traces:
- T1: Event firing during "starting" phase
- T2: Event firing during "retrying" phase

Format (for each trace):
| Trace | Step | State Before | Event Fired | Guard Check | State Mutation | State After | Invariant Check | Result |
|-------|------|--------------|-------------|-------------|----------------|-------------|-----------------|--------|
| T1 (starting) | 1 | ??? | ??? | ??? | ??? | ??? | ??? | ✓/✗ |
| T1 | 2 | ??? | ??? | ??? | ??? | ??? | ??? | ✓/✗ |
| T2 (retrying) | 1 | ??? | ??? | ??? | ??? | ??? | ??? | ✓/✗ |
| T2 | 2 | ??? | ??? | ??? | ??? | ??? | ??? | ✓/✗ |

Pass criteria (you MUST verify):
✓ Two complete traces per guarded callback
✓ State checkpointed in "State Before" column for each step
✓ Guard checks shown with pass/fail (e.g., "attemptId: 1≠2 ✗")
✓ Stale events (mismatched attemptId) show mutation: SKIP
✓ Invariants verified at each step

Critical proof: T2 trace MUST show stale event (prior attemptId) being rejected.

Output: All trace tables in markdown format.
```

**Context size**: ~2000-2500 tokens (spec + GEM output)
**Note**: This is the longest lane - consider splitting if >5 callbacks

---

### Lane 4: Resource Lifecycle Validator

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are validating resource cleanup for this specification:

[SPEC TEXT]

From the checklist, these resources were identified:
[CHECKLIST: Resources section]

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

Output: The completed matrix in markdown table format.
```

**Context size**: ~1500 tokens

---

### Lane 5: Invariant Validator

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are proving invariants for this specification:

[SPEC TEXT]

From the checklist, these invariants were identified:
[CHECKLIST: Invariants section]

From Lane 3, these traces are available:
[LANE 3 OUTPUT: Trace tables]

Your ONLY task: Fill this Invariant Proof Matrix

| Invariant | Where Checked | Violation Impact | Proof (Lane 3 ref) | Holds? |
|-----------|---------------|------------------|-------------------|--------|
| ??? | ??? | ??? | ??? | ✓/✗ |

Pass criteria (you MUST verify):
✓ Every invariant from checklist has a row
✓ Proof references specific Lane 3 trace (e.g., "T2 onDisconnect step 2")
✓ Violation impact clearly stated
✓ All invariants proven to hold (Holds? = ✓)

Common pitfalls:
- Vague proof ("trace shows it works" vs "T2 step 2: guard rejects")
- Missing reference to Lane 3 output
- Invariant not actually checked in traces

Output: The completed proof matrix in markdown table format.
```

**Context size**: ~2000-2500 tokens (spec + Lane 3 output can be large)

---

### Lane 6: Cross-Tab Coordinator Validator

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are validating session lock rules for this specification:

[SPEC TEXT]

From the checklist, these ownership rules were identified:
[CHECKLIST: Ownership section]

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

Output: The completed matrix in markdown table format.
```

**Context size**: ~1500 tokens

---

### Lane 7: Performance Budget Validator

**Prompt template**:
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are validating performance budgets for this specification:

[SPEC TEXT]

From Lane 1, these transitions were identified:
[LANE 1 OUTPUT: State transition matrix]

Your ONLY task: Fill this Performance Budget Matrix

| Critical Path Step | Budget (ms) | Cumulative (ms) | Timeout Behavior | Cut-Through Cancel? | Observability Event |
|--------------------|-------------|-----------------|------------------|---------------------|---------------------|
| ??? | ??? | ??? | ??? | ??? | ??? |

Pass criteria (you MUST verify):
✓ Every step on critical path has budget
✓ Cumulative budget tracked (shows total latency)
✓ Timeout behavior defined for all "Wait for" steps
✓ Cut-through cancellation specified (can mode switch preempt?)
✓ Observability events mapped (state_enter, timer_start, etc.)

Common pitfalls:
- Missing budgets for "Wait for" steps
- No cumulative total (can't see end-to-end SLO)
- Unclear cut-through behavior

Output: The completed matrix in markdown table format.
```

**Context size**: ~1500 tokens

---

### Lane 8: False Positive Filter (Batch 4)

**Purpose**: Validate each bug found in Lanes 1-7 to eliminate false positives and provide additional context.

**Execution**: Launch in sub-batches of **max 5 agents** in parallel. If 26 bugs found, run 6 sub-batches sequentially (5+5+5+5+5+1).

**Prompt template** (one agent per bug):
```
CRITICAL: Use Think-Aloud Protocol - write your full reasoning step-by-step. Do NOT just think silently.

You are validating a SINGLE bug found by earlier validation lanes.

Bug ID: {{bug.id}} (e.g., P0-1, P1-3, P2-7)
Priority: {{bug.priority}}
Description: {{bug.description}}
Location: {{bug.location}} (file:line)
Found by: Lane {{bug.lane}}

Your ONLY task: Determine if this bug is REAL or FALSE POSITIVE.

---

## Validation Protocol

### Step 1: Read Surrounding Context (50 lines before/after)
- Use Read tool to get {{bug.location}} with context
- Identify: Resource creation, guards, error paths, cleanup

### Step 2: Trace Resource Lifecycle
Answer these questions with exact line numbers:
1. Where is the resource created/acquired? (line #)
2. Is creation inside or outside try block?
3. Is creation guarded by conditions? (if statements, early returns)
4. Can the error path execute WITHOUT resource being created?
5. Is there cleanup in other paths we should check?

### Step 3: Check Common False Positive Patterns

Pattern 1: Resource Never Acquired
- ❌ Agent flags: "Missing cleanup in catch block"
- ✅ Reality: Resource created AFTER try-catch completes
- Example:
  try { await connect(); } catch (e) { throw e; }  // Error path
  resource.set();  // ← Created AFTER (line 100)
- Conclusion: FALSE POSITIVE if resource created after error path

Pattern 2: Protected by Guard in Caller
- ❌ Agent flags: "Unbounded array growth"
- ✅ Reality: Caller checks MAX_SIZE before calling
- Example:
  if (queue.length >= MAX_QUEUE) return;  // Guard in caller
  queue.push(item);  // Flagged line
- Trace call graph to find guards
- Conclusion: FALSE POSITIVE if guard exists upstream

Pattern 3: Correct Invariant Protection
- ❌ Agent flags: "Guard blocks valid operations"
- ✅ Reality: Guard enforces state machine rules
- Example:
  if (state !== 'idle') return;  // Flagged as too aggressive
  // But this SHOULD block non-idle states
- Understand state machine semantics
- Conclusion: FALSE POSITIVE if guard is correct by design

Pattern 4: Conditional Resource
- ❌ Agent flags: "Missing cleanup for resourceB"
- ✅ Reality: resourceB only created conditionally
- Example:
  if (mode === 'advanced') { resourceB = create(); }
  // Cleanup only cleans resourceA, not resourceB
- Check if condition can be false on error path
- Conclusion: UNCERTAIN - need to trace all paths

Pattern 5: Async Timing Misunderstanding
- ❌ Agent flags: "Race condition, no lock"
- ✅ Reality: JavaScript is single-threaded, await ensures order
- Example:
  await operation();
  state = 'done';  // Flagged as race
  // But await guarantees sequential execution
- Conclusion: FALSE POSITIVE if misunderstands JS concurrency

Pattern 6: SDK Handles Cleanup
- ❌ Agent flags: "Event listener not removed"
- ✅ Reality: SDK automatically cleans up on disconnect
- Check SDK documentation or code
- Conclusion: FALSE POSITIVE if SDK manages lifecycle

### Step 4: Prove Conclusion
Choose ONE:

**If CONFIRMED (Real Bug):**
Provide execution trace showing bug:
```
Time 0: Resource created (line X)
Time 1: Error occurs (line Y)
Time 2: Catch block executes (line Z)
Result: Resource leaked, not cleaned up
```

**If FALSE POSITIVE:**
Show why resource doesn't exist or is cleaned elsewhere:
```
Error path: Line Y throws
Check line X: Resource created AFTER line Y
Conclusion: Resource doesn't exist when error throws
```

**If UNCERTAIN:**
Explain what additional information is needed:
```
Need to verify: Does condition X always = true when error occurs?
If yes → REAL BUG
If no → FALSE POSITIVE
Requires runtime tracing or user confirmation
```

### Step 5: Output Format
**Status:** CONFIRMED | FALSE_POSITIVE | UNCERTAIN
**Confidence:** High | Medium | Low
**Evidence:**
[Code quotes with line numbers showing proof]

**Execution Trace:**
[Step-by-step trace if CONFIRMED, or why false positive]

**Recommendation:**
- If CONFIRMED: "Fix by [specific action]. Priority: {{bug.priority}}"
- If FALSE_POSITIVE: "Not a bug because [reason]. Lane {{bug.lane}} missed [what]."
- If UNCERTAIN: "Need to verify [what]. Suggest [approach]."

**Additional Context (if CONFIRMED):**
[Any related bugs, dependencies, or implementation notes]

---

## Pass Criteria
✓ Read 50+ lines of context around bug location
✓ Traced resource lifecycle with exact line numbers
✓ Checked all 6 common false positive patterns
✓ Provided execution trace or proof
✓ Clear status (CONFIRMED/FALSE_POSITIVE/UNCERTAIN)
✓ Evidence includes code quotes

## Common Pitfalls
- Assuming resource exists without checking creation location
- Not tracing call graph for upstream guards
- Misunderstanding state machine semantics
- Ignoring SDK documentation
- Vague evidence ("code looks wrong" vs "line 100 shows X")

---

Output: Complete validation report in format above.
```

**Context size**: ~2500-3000 tokens (bug details + patterns + protocol)

**Batching strategy for Batch 4**:
```javascript
// Example: 26 bugs found
const bugs = [...]; // All bugs from Lanes 1-7
const BATCH_SIZE = 5;

for (let i = 0; i < bugs.length; i += BATCH_SIZE) {
  const batch = bugs.slice(i, i + BATCH_SIZE);

  // Launch up to 5 agents in parallel
  batch.forEach(bug => {
    Task({
      subagent_type: "general-purpose",
      model: "haiku",  // Faster, cheaper for focused validation
      description: `Validate bug ${bug.id}`,
      prompt: createBugValidationPrompt(bug)
    })
  });

  // Wait for batch to complete before next batch
  await waitForBatchCompletion();
}

// After all batches: compile results
const confirmed = validations.filter(v => v.status === 'CONFIRMED');
const falsePositives = validations.filter(v => v.status === 'FALSE_POSITIVE');
const uncertain = validations.filter(v => v.status === 'UNCERTAIN');

// Write to file
fs.writeFileSync('/tmp/claude/validation-results.md', compileReport({
  confirmed,
  falsePositives,
  uncertain,
  summary: {
    totalBugs: bugs.length,
    confirmed: confirmed.length,
    falsePositives: falsePositives.length,
    uncertain: uncertain.length,
    falsePositiveRate: (falsePositives.length / bugs.length * 100).toFixed(1) + '%'
  }
}));
```

---

### Lane 1: State Transition Matrix

| From | Event | To | Timeout? | Value | Timeout Path | Cleanup |
|------|-------|----|----|---------|---------|-------------|
| idle | Start | starting | Yes | 10s | failed | Clear resources |
| starting | Success | active | No | - | - | Set lock |
| starting | Timeout | failed | - | - | - | Clear all |

**Pass**: Every Wait for has timeout + path; terminals have cleanup.

---

### Lane 2: Guarded Event Matrix (GEM)

| Callback | Phases | Guard | Permitted | Forbidden | Outcome | Invariants | Budget(ms) |
|----------|--------|-------|-----------|-----------|---------|------------|------------|
| onConnect | starting, retrying | phase + attempt | Set: active, lock | No idle during retry | continue | phase-resource | 200 |
| onDisconnect | all | phase + attempt | Clear lock, Set idle (if guard) | No idle during retry unless match | exit/continue | hygiene | 200 |

**Pass (Tier 2)**: attempt_guard present; forbidden updates include "no idle during retry".

---

### Lane 3: Two-Trace Execution

**For each guarded callback**, produce:

| Trace | Step | State Before | Event | Guard | Mutation | State After | Invariant | Pass |
|-------|------|--------------|-------|-------|----------|-------------|-----------|------|
| T1 (starting) | 1 | mode: starting, attempt: 1 | - | - | - | same | phase-res ✓ | ✓ |
| T1 | 2 | starting, attempt: 1 | onDisconnect (attempt: 1) | phase ✓, attempt 1=1 ✓ | Set: failed | failed, attempt: 1 | hygiene ✓ | ✓ |
| T2 (retrying) | 1 | mode: retrying, attempt: 2 | - | - | - | same | phase-res ✓ | ✓ |
| T2 | 2 | retrying, attempt: 2 | onDisconnect (attempt: 1) | phase ✓, attempt 1≠2 ✗ | **SKIP** | retrying (unchanged) | no demotion ✓ | ✓ |

**Pass**: Stale events (mismatched attemptId) rejected; state checkpointed at each step.

---

### Lane 4: Resource Cleanup Matrix

| Resource | Created | Cleanup: Success | Cleanup: Failure | Cleanup: Cancel | Cleanup: Timeout | Depends On |
|----------|---------|------------------|------------------|-----------------|------------------|------------|
| Connection | Start | Stop on idle | Clear on failed | Clear on idle | Clear after 10s | none |
| SessionLock | After connect | Clear on idle | Clear on failed | Clear on idle | Clear on failed | Connection |

**Pass**: All 4 outcomes covered; dependency order (child before parent).

---

### Lane 5: Invariant Proof Matrix

| Invariant | Where Checked | Violation Impact | Proof (Lane 3 ref) | Holds |
|-----------|---------------|------------------|-------------------|-------|
| Phase-resource: If connected → mode matches | After onConnect | Billing mismatch | T1 onConnect step 2 ✓ | ✓ |
| No demotion during retry | After onDisconnect in retry | Lost progress | T2 onDisconnect step 2 ✓ | ✓ |

**Pass**: Every invariant references specific Lane 3 trace steps.

---

### Lane 6: Cross-Tab Lock Rules

| Lock Field | Set When | Clear When | Staleness | Takeover | Heartbeat |
|------------|----------|------------|-----------|----------|-----------|
| owner | After connect success | All exits | 30s no heartbeat | Require miss + force | 10s |

**Pass**: Set AFTER success; cleared ALL exits; staleness defined.

---

### Lane 7: Performance Budget

| Step | Budget (ms) | Cumulative | Timeout Behavior | Cut-Through? |
|------|-------------|------------|------------------|--------------|
| Call connect | 5000 | 5000 | Clear + failed | Yes (mode switch) |
| Wait onConnect | 10000 | 15000 | Clear + failed | Yes |

**Pass**: Every step has budget; timeout paths defined; cut-through specified.

---

## Stage 4: Integration & Reporting

**Check**:
- All 7 lanes complete (Batches 1-3)
- All bugs validated (Batch 4)
- No contradictions (GEM vs traces, resources vs transitions)
- Self-check passes

**Compile Final Report**:

1. **Raw Findings** (Batches 1-3):
   - Total bugs found by all lanes
   - Grouped by priority (P0/P1/P2)
   - Include lane number that found each bug

2. **Validation Results** (Batch 4):
   - CONFIRMED bugs (real issues to fix)
   - FALSE POSITIVES (not actual bugs, with explanation)
   - UNCERTAIN (need additional verification)
   - False positive rate (X%)

3. **Final Bug List**:
   - Only CONFIRMED bugs
   - Grouped by priority
   - With evidence and recommendations from Batch 4

4. **Summary Statistics**:
   ```
   Total bugs found: 26
   Validated: 26
   - Confirmed: 18 (69%)
   - False Positives: 4 (15%)
   - Uncertain: 4 (15%)

   By Priority:
   - P0: 1 confirmed, 1 false positive
   - P1: 5 confirmed, 3 false positives
   - P2: 12 confirmed, 0 false positives
   ```

5. **Write to File**:
   ```
   /tmp/claude/validation-results.md
   ```

   Include all sections above in structured markdown format.

**Output Format**:
```markdown
# Validation Results - [Component Name]

## Executive Summary
- X bugs confirmed
- Y false positives (Z%)
- Priority breakdown

## Confirmed Bugs
### P0 Bugs
[Bug details with evidence]

### P1 Bugs
[Bug details with evidence]

### P2 Bugs
[Bug details with evidence]

## False Positives
[Each false positive with explanation]

## Uncertain Findings
[Each uncertain finding with what's needed]

## Appendix: Raw Findings
[All bugs from Batches 1-3 before validation]
```

---

## Common Pitfalls

| Pitfall | Detection | Fix |
|---------|-----------|-----|
| Missing attempt_guard | Lane 2 GEM lacks it | Add to Guard column |
| Mode demotion allowed | Lane 2 Forbidden empty | Add "No idle during retry" |
| Trace not executed | Lane 3 empty/described | Produce actual step table |
| Resource leak | Lane 4 missing outcome | Add cleanup for all 4 |
| Invariant not proven | Lane 5 no Lane 3 ref | Reference specific trace steps |

---

## Example: Voice Session Retry

**Tier**: 2 (retry + callbacks + mode switch = score 6)

**Checklist**:
- Resources: VoiceWebRTC, SessionLock
- Callbacks: onConnect (phase+attempt), onDisconnect (phase+attempt)
- Invariants: Phase-resource, terminal hygiene
- Traces: onConnect T1/T2, onDisconnect T1/T2
- Errors: Timeout, late disconnect, mode switch during retry

**Lane 2 (GEM)**:
| Callback | Phases | Guard | Forbidden |
|----------|--------|-------|-----------|
| onDisconnect | starting, retrying, active | phase + attempt | No idle during retry unless attemptId matches |

**Lane 3 (Trace T2 - retrying)**:
| Step | State | Event | Guard | Mutation | Result |
|------|-------|-------|-------|----------|--------|
| 1 | retrying, attempt:2 | onDisconnect (attempt:1) | 1≠2 ✗ | SKIP | retrying ✓ |

**Result**: Stale disconnect from prior attempt cannot demote retry mode.

---
name: Spec Creator
description: Concise DSL for deterministic, readable feature specs and change requests used by LLM agents.
version: 1.2.0
---

## Purpose
Enable clear requirements and change descriptions that are:
- Readable by non-developers
- Deterministic for LLM code generation
- Declarative (WHAT, not HOW)
- Consistent across features and edits

## Implementation Approaches

**Default:** Specs are written in DSL, then LLMs generate standard React/TypeScript code (hooks, components, mutations).

**Alternative (Complex State Management):** For Process specs with complex session lifecycles (tier ≥2), LLMs can generate state machine runtime code instead.

**When to use state machines:** See `.claude/skills/spec/state-machine-translation.md`
- Decision criteria (when to use vs standard code)
- Complete DSL → TypeScript translation example
- React integration patterns
- Best practices for readability

**Quick decision:** Use state machines if Process has ≥10 transitions, retry logic, cross-tab coordination, or strict resource cleanup requirements. Otherwise, use standard React code.

## Golden Rules (must follow)
- Use only the approved action verbs (no synonyms).
- Use "Call" for named APIs/queries/mutations/actions; use "Do" for general processes.
- Use `STATE.*` for boolean/status flags and local status tracking.
- Always specify exact data sources with dot notation (DB, Session, STATE, Props, API).
- Use natural language; no code-like syntax (no arrows, no function notation).
- Prefer concise examples; outcomes over implementation details.
- Use actual SDK parameter names literally when they exist (e.g., dynamicVariables, agentId, signedUrl).
- Consistency is mandatory: same action = same verb, everywhere.

### Five Golden Alignment Rules ( Break only with justification)
- One source of truth for state; refs only for imperative handles.
- Single‑flight transitions; define queue/cancel behavior.
- Every Wait has a Timeout and a single On timeout path.
- Every resource has cleanup in all terminal outcomes, in dependency order.
- Invariants are checked after recovery and before finalization.

## File Organization & Naming
- Author all specifications in our TOML-like DSL.
- Save files under the `specs/` directory with the `.spec` extension.
- Use kebab-case filenames; organize by subfolders when helpful (e.g., `features/`, `processes/`).
- Examples:
  - `specs/features/voice-chat.spec`
  - `specs/processes/webrtc-signaling.spec`

## Controlled Vocabulary (Actions)
Use only these 19 verbs:
- Set: assign/change a value or state
- Send: transmit data or messages
- Check: evaluate a condition
- Wait for: pause until a condition/event
- Clear: reset/empty data or state
- Start: begin a process/session
- Stop: end a process/session
- Show: make UI visible
- Hide: make UI invisible
- Add: insert into a collection
- Remove: delete from a collection (non-permanent list removal)
- Call: invoke a named API/function/query/mutation/action
- Do: perform a general process (no specific name)
- Save: persist data
- Read: retrieve data
- Update: modify existing data
- Delete: permanently remove data
- Create: make a new entity/session
- Redirect: navigate to a different page

Call vs Do (final rule):
- Call = specific named thing: "Call CreateTodo mutation", "Call Stripe API"
- Do = general process: "Do authentication", "Do cleanup"

## Session Lifecycle Enforcement (Auto-activates for Tier ≥2)

### Trigger Detection (Automatic)
If spec includes ANY: retry, reconnect, attempt, session, cross-tab, takeover, onConnect, onDisconnect, onStatusChange → **Default Tier 2** (require justification to downgrade).

### Seven Mandatory Rules (Non-Negotiable for Tier ≥2)
1. **Attempt Guards**: All callbacks MUST Check `event.attemptId equals STATE.current_attemptId`; if mismatch → Skip mutations
2. **Mode Demotion Ban**: Forbidden during starting/retrying: `Set mode: idle` (unless attempt_guard passes)
3. **Two-Trace Execution**: For each guarded callback, produce T1 (starting) and T2 (retrying) with state checkpoints + invariants
4. **Retry Reassertion**: On retry: `Set mode: starting`, `Set attemptId: new`, Clear failed resources, Clear timers
5. **Phase-Resource Invariants**: Define and check: If connection: connected → mode matches; If mode: idle → connections: closed
6. **Terminal Hygiene**: Terminal states MUST Clear all timers/listeners/streams/locks; prove in all exit paths
7. **Observability**: Log attemptId on Start/Retry/callbacks; emit state_enter/exit, timer_start/stop, resource_create/cleanup

### Detailed Validation Workflow
For step-by-step lane validation (GEM, traces, resources, invariants, cross-tab, performance):
→ See `.claude/skills/spec/validation-workflow.md` (loaded only when Tier ≥2 detected)

## States and Data
- Use `STATE.*` for boolean/status flags (e.g., `STATE.loading: yes/no`).
- Distinguish status from data fields (e.g., `Error details: text`).
- Data source notation:
  - DB.Table.field
  - Session.user.field
  - STATE.field
  - Props.field
  - API.endpoint.field

Comparison operators (use plain math symbols): `>`, `<`, `>=`, `<=`, `: value`, `: one of [a, b]`, `: not empty`, `: contains "text"`.

Prohibited wording (use replacements):
- Initialize/init → Create
- Apply/assign/mark/flag → Set
- Flush/drain → Send all
- Load/fetch/get → Read
- Execute/invoke/trigger → Call (named) or Do (process)
- Display/render → Show
- await/block until → Wait for
- Arrows or code notations → natural language conditions

## Conditions Language
- Show if: / Hide if:
- Execute if: / Skip if:
- When user clicks: / When form submits:

## DSL Blocks (minimal templates and canonical examples)

### Define
```toml
[Define EntityName]
Description: What this entity represents

Fields:
  fieldName: type (description)
  status: text (Options: active, inactive)

Source: Database table or API
Storage: Where it persists
```

Example:
```toml
[Define UserAccount]
Description: Registered user

Fields:
  email: text
  subscription: text (Options: free, premium)
  verified: yes/no
  lastLogin: timestamp

Source: DB.Users
Storage: Primary database
```

### State
```toml
[State ComponentState]
Description: Local state for component

Data fields:
  STATE.loading: yes/no (Default: no)
  Error details: text (Default: none)
  Selected item: reference to Item (Default: none)

Lifecycle: Component-scoped
Reset when: Component unmounts
```

### Component
```toml
[Component ComponentName]
Type: Server / Client
Description: Purpose and behavior

Rendering: Server-side / Client-side

Props received:
  propName: type (description)

Internal state:
  STATE.submitting: yes/no
  Data field: type

Data fetching:
  Query: QueryName(parameters)
  Subscribed: yes/no

User interactions:
  When [event]:
    - Action description

Styling: Tailwind classes or description
Children: accepts/doesn't accept
```

Example:
```toml
[Component TodoList]
Type: Client
Description: Interactive list of user todos

Props received:
  userId: text (required)

Internal state:
  STATE.adding: yes/no (Default: no)
  New todo text: text (Default: empty)

Data fetching:
  Query: GetUserTodos(userId)
  Subscribed: yes

User interactions:
  When user clicks "Add Todo":
    - Set STATE.adding: yes
    - Show input field

  When user submits new todo:
    - Call CreateTodo mutation with (text: New todo text, userId)
    - Set New todo text: empty
    - Set STATE.adding: no
```

### Query (Convex)
```toml
[Query QueryName]
Description: Read-only, reactive data

Input parameters:
  paramName: type

Data source: DB.Table

Filter by:
  DB.Table.field: value

Sort by: field (ascending/descending)
Return: List / Item / Count
Subscribed: yes/no
```

Example:
```toml
[Query GetUserTodos]
Description: Todos for a user

Input parameters:
  userId: text
  status: text (Options: all, active, completed. Default: all)

Data source: DB.Todos

Filter by:
  DB.Todos.userId: matches input userId
  If status not "all": DB.Todos.status: matches input status

Sort by: createdAt (descending)
Return: List of todos
Subscribed: yes
```

### Mutation (Convex)
```toml
[Mutation MutationName]
Description: Create/Update/Delete data

Input parameters:
  paramName: type

Operation: Create / Update / Delete

When Create:
  Table: DB.Table
  Set fields:
    field1: value
    createdAt: current timestamp

When Update:
  Table: DB.Table
  Find by: DB.Table.id: matches input id
  Update fields:
    field1: new value

When Delete:
  Table: DB.Table
  Find by: DB.Table.id: matches input id
  
Check before:
  - Rule 1

On success:
  - Return created/updated item

On error:
  - Return error: message
```

Example:
```toml
[Mutation CreateTodo]
Description: Create a new todo for user

Input parameters:
  text: text
  userId: text

Operation: Create

Check before:
  - Input text: not empty
  - Input text length < 500
  - DB.Users.id: matches input userId

When Create:
  Table: DB.Todos
  Set fields:
    text: input text
    userId: input userId
    status: active
    completed: no
    createdAt: current timestamp

On success:
  - Return created item
```

### Action (Server operation)
```toml
[Action ActionName]  
Description: Server-side operation (can call external APIs)

Input parameters:
  paramName: type

Steps:
  - Step using Convex or external API
  - Step processing results

Timeout: duration
Return: result data
```

Example:
```toml
[Action ProcessPayment]
Description: Process payment via Stripe and update order

Input parameters:
  orderId: text
  paymentMethodId: text

Steps:
  - Read order from DB.Orders
  - Call Stripe API to process payment
  - If success: Update DB.Orders status: paid
  - If failure: Update DB.Orders status: failed
  - Send confirmation email
  
On error:
  - Return error with reason

Timeout: 30 seconds
```

### Page (Next.js)
```toml
[Page PageName]
Path: /path
Type: Server / Client component
Description: Purpose

Access control:
  Requires: Authentication / Role

Params from URL:
  paramName: type

Search params:
  paramName: type

Data loading:
  - Read on server / client
  - Queries used

SEO metadata:
  Title: text
  Description: text
```

### API Route (Next.js)
```toml
[API Route RouteName]
Path: /api/path
Method: GET / POST / PUT / DELETE / PATCH
Description: Purpose

Authentication required: yes/no
Rate limited: yes/no

Request body:
  fieldName: type

Validation:
  - Rule 1

Processing:
  - Step 1

Response success:
  Status: 200/201/...
  Body: structure

Response error:
  Status: 400/401/404/500
  Body: error structure
```

## Processes (Workflows)
Structured, reusable process definitions (state machines) that features can reference. Use this to model protocols and lifecycles with resources, states, transitions, invariants, and error scenarios. "Workflow" is accepted as an alias.

### Process Schema (TOML-style)
```toml
[Process ProcessName]
Version: 1.0
Description: What this workflow manages
Performance tier: 1 | 2 | 3
Requires reference:
  - performance@1.0 (optional)

Actors:
  - actor_1
  - actor_2

Resources:
  [Resource ResourceName]
  Created when: condition or step
  Cleaned up when:
    - condition or step
  Depends on: OptionalOtherResource
  Must not leak: validation rule
  Why important: brief reason or cost
  Expires after: optional duration
  Cost: optional description

States:
  List: [state_a, state_b, state_c]
  Terminal: [terminal_state]

State descriptions:
  state_a: short explanation
  state_b: short explanation

Transitions:
  [Transition TransitionName]
  From: [state_a]
  To: state_b
  Triggered by:
    - Event or condition (use natural language)
  Steps:
    - Use approved verbs (Set, Send, Start, Stop, Clear, Add, Remove, Call, Do, Save, Read, Update, Delete, Create, Show, Hide, Wait for, Redirect)
  Timeout: optional duration
  On timeout:
    - Steps using approved verbs

Invariants:
  [Invariant InvariantName]
  Check: structured predicate using data sources
  Impact if violated: consequence

Error scenarios:
  [ErrorScenario ScenarioName]
  Starting state: state_a
  Timeout: optional duration
  Must handle:
    - Steps using approved verbs
```

### Referencing Processes from Features
Add explicit references with versions so the agent can load and merge state machines.

Example:
```toml
[Action StartVoiceConversation]
Description: Start voice chat and manage transport lifecycles

Depends on process:
  - webrtc-signaling@1.0
  - websocket-connection@1.2

Steps:
  - Call startVoiceConnection
  - Wait for connection ready
```

### Performance & Budgets (minimal)
Keep this section short and present in all workflows. Use stricter external reference only when needed.

Must include:
- Overall SLO and per-step time budgets for the critical path
- No arbitrary delays: every Wait for includes Timeout and On timeout steps
- Cut-through cancellation: cancellation/mode switch preempts any outstanding waits
- Single-flight transitions: concurrent requests must queue or cancel; no reentrancy
- Observability: emit events to measure budgets (state_enter/exit, transition, timer_start/stop)

Activation of detailed reference:
- If Performance tier ≥ 2 or Requires reference contains performance@1.0, apply extended performance rules via the external reference

### Complex Transitions (Multi-Stage)
For transitions with retry/recovery logic, document explicit stages and scopes.

Error scope (declare both):
- Stage-level On error: continue or exit
- Transition-level On error: terminal exit only; must stop further stages

Structure:
```toml
[Transition ComplexOperation]
Execution flow (sequential stages):

  [Stage 1: Preparation]
  Steps: ...
  State after Stage 1:
    field1: value
  Outcomes:
    Success → Continue to Stage 2
    Error/Timeout → Exit transition or Continue (declare explicitly)

  [Stage 2: Recovery]
  Steps: ...
  State after Stage 2:
    field1: new_value
  Outcomes:
    Success → Continue to Stage 3
    Error/Timeout → Exit transition

  [Stage 3: Finalization]
  Steps: ...

Invariant checks:
  - After recovery stages
  - Before finalization
```

Guidelines:
- Show state after each stage (deltas welcome)
- Declare whether a stage error exits or continues
- Place invariants after recovery and before finalization
- Maintain single‑flight semantics and stale‑event guards (e.g., runId/attemptId)

### Example Process: WebRTC Signaling (minimal)
```toml
[Process WebRTCSignaling]
Version: 1.0
Description: Manages WebRTC connection lifecycle and state

Actors:
  - client
  - peer
  - stun_server
  - turn_server

Resources:
  [Resource PeerConnection]
  Created when: Starting signaling process
  Cleaned up when:
    - Connection established
    - Connection failed
    - User cancels
  Must not leak: Verify stopped within 30 seconds
  Why important: Uses memory and network bandwidth

  [Resource DataChannel]
  Created when: PeerConnection: connected
  Cleaned up when:
    - PeerConnection: stopped
    - Error occurs
  Depends on: PeerConnection
  Must not leak: Stop before PeerConnection

  [Resource TurnAllocation]
  Created when: Starting signaling (for NAT traversal)
  Cleaned up when: Connection established
  Expires after: 10 minutes
  Cost: Pay per allocation

States:
  List: [idle, gathering, connecting, connected, failed]
  Terminal: [connected, failed]

State descriptions:
  idle: No connection attempt
  gathering: Collecting ICE candidates
  connecting: Attempting peer connection
  connected: Active connection
  failed: Gave up after retries

Transitions:
  [Transition Start connection]
  From: [idle]
  To: gathering
  Triggered by:
    - Call startVoiceConnection
  Steps:
    - Create PeerConnection
    - Create TurnAllocation
    - Start ICE candidate gathering
    - Set timeout: 15 seconds

  [Transition ICE gathering complete]
  From: [gathering]
  To: connecting
  Triggered by:
    - All ICE candidates collected
  Steps:
    - Send offer to peer
    - Wait for answer

  [Transition Connection established]
  From: [connecting]
  To: connected
  Triggered by:
    - Peer connection state: connected
  Steps:
    - Create DataChannel
    - Delete TurnAllocation
    - Clear all timeouts

  [Transition Connection timeout]
  From: [gathering, connecting]
  To: failed
  Triggered by:
    - Timeout: 15 seconds
  Steps:
    - Save error details
    - Stop PeerConnection
    - Delete TurnAllocation
    - Show error to user

  [Transition User cancels]
  From: [gathering, connecting]
  To: failed
  Triggered by:
    - User clicks cancel
  Steps:
    - Stop PeerConnection immediately
    - Delete TurnAllocation
    - Clear all timeouts

Invariants:
  [Invariant DataChannel requires PeerConnection]
  Check: If DataChannel exists: PeerConnection exists
  Impact if violated: Memory leak and broken connection

  [Invariant Turn allocation released promptly]
  Check: Within 1 second of connected: Delete TurnAllocation
  Impact if violated: Wasted cost

  [Invariant No hanging connections]
  Check: Reaches terminal state within 30 seconds
  Impact if violated: Resource leak and confused state

Error scenarios:
  [ErrorScenario Network drops during gathering]
  Starting state: gathering
  Must handle:
    - Stop PeerConnection
    - Delete TurnAllocation
    - Set state: failed

  [ErrorScenario Peer does not respond]
  Starting state: connecting
  Timeout: 15 seconds
  Must handle:
    - Do not wait forever
    - Clear all resources
    - Set state: failed
```

## Patterns (core)
Keep these minimal and consistent. Use them as canonical references.

### FormWithValidation
```toml
[Pattern FormWithValidation]
Description: Form with field and submission validation

Form fields:
  fieldName: type (rules)

Data state:
  Form data: object
  Validation errors: object
  STATE.validating: yes/no
  STATE.submitting: yes/no
  
On submit:
  If validation fails:
    - Show all error messages
    - Focus first invalid field
  If validation passes:
    - Set STATE.submitting: yes
    - Call SubmitMutation with (Form data)
    - On success:
      - Clear Form data
      - Show success message
      - Redirect or update UI
    - On error:
      - Show server error
      - Set STATE.submitting: no
```

### ErrorHandling
```toml
[Pattern ErrorHandling]
Description: Consistent error handling

Error types:
  validation / network / authorization / not_found / server

Error state:
  STATE.hasError: yes/no
  Error message: text
  Error details: object

Display:
  Validation: inline near fields
  Network: toast with retry
  Authorization: message or redirect
  Not found: 404/empty state
  Server: error page or toast
```

### LoadingStates
```toml
[Pattern LoadingStates]
Description: Indicate async operations

Loading types:
  initial / refresh / action / partial

State:
  STATE.loading: yes/no
  STATE.loadingSection: text

Guidelines:
  - Initial: skeleton or page spinner
  - Refresh: subtle spinner, keep content visible
  - Action: button spinner, disable button
  - Partial: spinner in section only

Timeout handling:
  If loading exceeds timeout:
    - Show error message
```

### OptimisticUpdate
```toml
[Pattern OptimisticUpdate]
Description: Update UI immediately, then sync with server

Immediate UI:
  - Update local state/UI

Server sync:
  - Call MutationName

On success:
  - Keep updated UI

On error:
  - Revert to previous state
  - Show error message
```

### Modal
```toml
[Pattern Modal]
Trigger: What opens the modal
Content: What's inside
Close actions: How to dismiss

STATE.open: yes/no (Default: no)

When opened:
  - Set STATE.open: yes
  - Trap keyboard focus
  - Prevent body scroll

When closed:
  - Set STATE.open: no
  - Restore focus to trigger
  - Re-enable body scroll

Close methods:
  - Click backdrop
  - Press Escape
  - Click close button
  - Complete action
```

## Actions & Behaviors (canonical)
```toml
[Action SaveUserProfile]
Description: Save profile changes

Execute if:
  STATE.form_has_changes: yes
  STATE.form_is_valid: yes

Steps:
  - Collect form values
  - Check email format is valid
  - Call UpdateUser mutation with (values)
  - Wait for confirmation

On success:
  - Show message: "Profile updated"
  - Set STATE.form_has_changes: no
  - Read updated user data

On error:
  - Show error message
  - Keep form in edit mode
  - Save error details

Timeout: 10 seconds
Retry: no
```

## Change Syntax (edits to existing specs)
```toml
[Change UniqueChangeName]
Type: bug fix / feature / improvement / refactor
Reason: Why this is needed
Affects: Component or system

[Existing specification that stays the same]
...existing content...

[~ Modify SectionName]
Description: What's changing and why
Old:
  field: old value
New:
  field: new value
  + newField: new value added

[+ Add NewSectionName]
Description: What this new section does
...new content...

[- Remove OldSectionName]
Reason: Why this is being removed
```

Example:
```toml
[Change FixSessionCleanup]
Type: bug fix
Reason: Text sessions not ending when switching to voice
Affects: Session management

[~ Modify Session Text]
Description: Add cleanup before mode switch
Old behavior:
  Cleanup when:
    - User explicitly ends text session
New behavior:
  Cleanup when:
    - User explicitly ends text session
    - User switches to voice mode
    - Session times out after idle period

[+ Add Action CleanupTextSession]
Description: Cleanup text session before switching modes
Execute if:
  Text connection state: connected
Steps:
  - Send end signal
  - Wait for closed
  - Clear session data
On error:
  - Force close after timeout
  - Save warning
Timeout: 2 seconds
Retry: no
```

## Specification Template (use this as default)
```toml
[Component/Action/Query/Mutation/Page/API Route Name]
Description: Clear purpose

# Define what it does
Input: ...
Data: ...
Behavior: ...

# Conditions
Show if: ...
Execute if: ...

# Interactions (USE CONTROLLED VOCABULARY)
When user [action]:
  - Set [field]: [value]
  - Call [named function/mutation]
  - Wait for [event]
  - Send [data]
  - Show [message]

# Outcomes
On success:
  - Clear [data]
  - Redirect to [page]
On error:
  - Show [error]
  - Stop [process]
```

## Short Correctness Examples
Correct vs Incorrect (Call vs Do):
```toml
✅ Call CreateTodo mutation
❌ Do CreateTodo mutation

✅ Do authentication
❌ Call authentication
```

Correct vs Incorrect (STATE naming):
```toml
✅ STATE.loading: yes
❌ State.loading: yes
```

## Self-check before output (LLM)
**Basic (always):**
- ✓ Approved verbs only; Call for named, Do for processes; `STATE.*` for status
- ✓ Exact data sources (dot notation); no arrows; SDK names literal; minimal examples

**Tier ≥2 (if triggers present: retry/session/callbacks):**
- ✓ All 7 mandatory rules applied: attempt guards, mode ban, two-trace, reassertion, invariants, hygiene, observability
- ✓ GEM with attempt_guard for callbacks; forbidden updates documented; two traces PRODUCED (not described)
- ✓ For detailed validation: reference `.claude/skills/spec/validation-workflow.md`

## Universal Process Authoring Guide
Purpose: Create reliable, domain-agnostic workflows that prevent leaks, stuck states, and ordering bugs.

Author these chapters (keep concise):
- State Machine:
  - States: list; Terminal: list
  - Transitions: single-flight (no reentrancy); each lists Steps using approved verbs
  - Every "Wait for" includes Timeout and On timeout steps
- Resources & Ownership:
  - For each resource: Created when, Cleaned up when (success/failure/cancel/timeout), Depends on, Must not leak (with bound)
  - Ownership rules: Set session owner after success; Clear session owner on exit; define staleness and takeover
  - Timed resources: TTL/heartbeat; what happens when expired or stale
- Concurrency & Ordering:
  - Guards for stale/out-of-order/duplicate events (ignore when mode or STATE does not match)
  - Mode gating (handle events only in the correct mode)
  - Policy for concurrent requests: queue or cancel; no parallel transitions
  - Ordering constraints that must hold before/after Call steps
- Invariants & Adversarial Scenarios:
  - Invariants: dependencies, time bounds, terminal reachability, zero dangling timers/listeners/queues at terminal
  - Error scenarios (3–5): timeouts, duplicate events, late disconnects, quick mode switches, partial cleanups
- Observability & Self-check:
  - Minimal events: state_enter/exit, transition, timer_start/stop, resource_create/cleanup, session_owner set/clear
  - Authoring checklist (below) must pass

Validation contract (must pass):
- No "Wait for" without Timeout and On timeout steps
- All non-terminal states have at least one outgoing transition and no ambiguous triggers
- Every created resource has cleanup in all terminal outcomes and follows dependency order
- All timers and listeners are stopped/cleared on state exit; none remain in terminal states
- Queues: max size, overflow policy, and flush/clear points defined; no Send before connected
- Session owner: Set after success; Clear on all exits; staleness and takeover defined

Composition & references:
- Use: Depends on process: name@version
- Define how shared events map across workflows and how conflicts are resolved
- Ensure composed workflows cannot deadlock or wait on each other indefinitely

Complexity tiers (choose based on risk):
- Tier 1 (simple): minimal state machine, 1–2 invariants, 1 scenario
- Tier 2 (moderate): full chapters, 3 invariants, 3 scenarios
- Tier 3 (critical): full chapters, locks/timers/queues, 5 invariants, 5 scenarios, composition review

Security & reliability essentials:
- Idempotency for mutating Call steps with dedup keys; bounded retries/backoff where applicable
- Preconditions for authorization/authentication; protect PII; never Save secrets to logs
- Rate limits where applicable; circuit-breaker boundaries if external services are unstable

Authoring self-check (answer "yes"):
- Are all resources cleaned in every terminal path?
- Do all "Wait for" steps have timeouts with safe cleanup?
- Are stale/out-of-order/duplicate events guarded?
- Are transitions single-flight with a policy for concurrent requests?
- Is session owner Set after success and Cleared on exit with takeover rules?
- Are all timers and listeners cleared before terminal states?
- Are queues bounded and flushed/cleared at the right moments?
- Do invariants make leaks and stuck states impossible within defined bounds?

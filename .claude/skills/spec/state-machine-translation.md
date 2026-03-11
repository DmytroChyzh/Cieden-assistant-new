# State Machine Translation Guide (Phase-1, Executable TS)

**Purpose:** Turn process specs into readable, safe TypeScript stateflow code for complex voice/text sessions (e.g., ElevenLabs), eliminating brittle ref spaghetti and stale-event races.

**When to use:** Use this pattern if you have retry/recovery, multiple resources (WS, mic, TTS), or cross-tab exclusivity. For simple UI flows (<5 states, no resources), stick to React hooks.

## Design Principles (what prevents bugs)

1. **Epoch guard** – every reconnect attempt has a monotonically increasing epoch; events from old epochs are ignored.

2. **Dual scopes** –
   - **attemptScope**: lives for the whole connect attempt (WS, session, long timers).
   - **stateScope**: lives for the current state (mic, TTS, duck/unduck).
   - Attempt scope dies only on reconnect; state scope dies on every state change.

3. **Entry/Exit hooks** – per-state resource ownership is explicit and always cleaned on exit (even on errors).

4. **Capability-aware validator** – we validate the right states for the right events (timeouts only where handshakes happen, etc.).

5. **Opcode mapping** – effects are small, named "opcodes" that run in the correct scope (attempt vs state).

## Event Taxonomy (namespaced & human-readable)

Use `DOMAIN.EVENT`:

- `CONNECT.*` – CONNECT.OK, CONNECT.CLOSE, CONNECT.ERROR, CONNECT.TIMEOUT
- `VAD.*` – VAD.START, VAD.END
- `AGENT.*` – AGENT.START, AGENT.END
- `USER.*` – USER.START, USER.STOP

This keeps specs and tests scannable.

## LLM Generation Workflow

**Input** → Use the process spec (states, transitions, resources, error cases).

**Generate** → Edit only:
- `transitions` table
- `entry` / `exit` hook maps

**Copy/Import** → Keep the runtime boilerplate as-is (Scope, dual scopes, makeRuntime, validate).

**Implement** → Opcodes using the epoch/scoping pattern (attempt vs state).

**Validate** → Run the validator; fix any capability errors it reports (timeouts, mic cleanup, connection errors).

**Guardrail:** LLM must not edit runtime types, epoch logic, or validator. Only the transition table + entry/exit.

## Types (LLM-editable surface is tiny)

```typescript
type SessionState =
  | 'disconnected'  // initial
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'recovering'
  | 'terminating';  // real terminal

type SessionEvent =
  | 'USER.START' | 'USER.STOP'
  | 'CONNECT.OK' | 'CONNECT.CLOSE' | 'CONNECT.ERROR' | 'CONNECT.TIMEOUT'
  | 'VAD.START' | 'VAD.END'
  | 'AGENT.START' | 'AGENT.END';

type AttemptOpcode = 'acquireLock' | 'openWebSocket' | 'provision' | 'backoff';
type StateOpcode   = 'startMic' | 'stopMic' | 'startTts' | 'stopTts' | 'duckPlayback' | 'unduckPlayback';

type Transition = { to: SessionState; do?: readonly (AttemptOpcode|StateOpcode)[] };
type TransitionTable = Record<SessionState, Partial<Record<SessionEvent, Transition>>>;

// LLM-editable hooks (must exist; keep them tiny & declarative)
const entry: Record<SessionState, readonly StateOpcode[] | undefined> = {
  listening: ['startMic'],
  speaking:  ['startTts']
};

const exit: Record<SessionState, readonly StateOpcode[] | undefined> = {
  listening: ['stopMic'],
  speaking:  ['stopTts','unduckPlayback']
};
```

## Transition Table (readable & scannable)

```typescript
export const transitions: TransitionTable = {
  disconnected: {
    'USER.START':  { to: 'connecting', do: ['acquireLock','openWebSocket'] },
  },

  connecting: {
    'CONNECT.OK':     { to: 'idle',       do: ['provision'] },
    'CONNECT.TIMEOUT':{ to: 'recovering', do: ['backoff']   },
    'CONNECT.CLOSE':  { to: 'recovering', do: ['backoff']   },
    'CONNECT.ERROR':  { to: 'recovering', do: ['backoff']   },
  },

  idle: {
    'VAD.START':      { to: 'listening' },
    'AGENT.START':    { to: 'speaking'  },
    'CONNECT.CLOSE':  { to: 'recovering', do: ['backoff'] },
    'CONNECT.ERROR':  { to: 'recovering', do: ['backoff'] },
  },

  listening: {
    'VAD.END':        { to: 'idle' },
    'CONNECT.CLOSE':  { to: 'recovering', do: ['backoff'] },
    'CONNECT.ERROR':  { to: 'recovering', do: ['backoff'] },
  },

  speaking: {
    'AGENT.END':      { to: 'idle' },
    'VAD.START':      { to: 'speaking', do: ['duckPlayback'] }, // barge-in (simple)
    'CONNECT.CLOSE':  { to: 'recovering', do: ['backoff'] },
    'CONNECT.ERROR':  { to: 'recovering', do: ['backoff'] },
  },

  recovering: {
    'USER.START':     { to: 'connecting', do: ['openWebSocket'] },
  },

  terminating: {}
};
```

## Runtime Skeleton (dual scopes + epoch guard)

```typescript
type Event = { type: SessionEvent; meta?: { epoch?: number; [k:string]:any } };

class Scope {
  constructor(public epoch: number) {}
  private d: Array<() => void> = [];
  private ac = new AbortController();
  aborted = false;
  get signal() { return this.ac.signal; }

  onCleanup(fn: () => void) { this.d.push(fn); }

  bind(send: (e: Event) => void) {
    return (e: Event) => queueMicrotask(() =>
      !this.aborted && send({ ...e, meta: { ...(e.meta||{}), epoch: this.epoch } })
    );
  }

  abort() {
    if (this.aborted) return;
    this.aborted = true; this.ac.abort();
    while (this.d.length) try { this.d.pop()!(); } catch {}
  }
}

type Ctx = {
  state: SessionState; epoch: number; sendIn: (e: Event) => void;
  // resource handles tagged with epoch...
  ws?: { socket: WebSocket; epoch: number };
  mic?: { stream: MediaStream; epoch: number };
  // etc.
};

let attemptScope: Scope | null = null;
let stateScope:   Scope | null = null;

function restartEpoch(ctx: Ctx) {
  attemptScope?.abort(); stateScope?.abort();
  ctx.epoch += 1;
  attemptScope = new Scope(ctx.epoch);
}

function enterState(ctx: Ctx, next: SessionState, ev: Event) {
  // run exit for previous state within *stateScope* then drop it
  if (stateScope) {
    (exit[ctx.state] ?? []).forEach(op => OPC[op](ctx, ev, stateScope!));
    stateScope.abort();
  }
  ctx.state = next;
  stateScope = new Scope(ctx.epoch);
  // run entry for new state within *stateScope*
  (entry[next] ?? []).forEach(op => OPC[op](ctx, ev, stateScope!));
}

const WITH_CONN: SessionState[]   = ['connecting','idle','listening','speaking','recovering'];
const WITH_TIMEOUT: SessionState[] = ['connecting'];
const WITH_MIC: SessionState[]     = ['listening'];

// single consumer loop + epoch guard
function makeRuntime(ctx: Ctx, table: TransitionTable) {
  const q: Event[] = []; let busy = false;
  ctx.sendIn = (e) => { q.push(e); pump(); };

  function pump() {
    if (busy) return; busy = true;
    while (q.length) {
      const ev = q.shift()!;
      if (ev.meta?.epoch != null && ev.meta.epoch !== ctx.epoch) continue; // drop stale

      const t = table[ctx.state]?.[ev.type];
      if (!t) continue;

      // execute transition
      enterState(ctx, t.to, ev);
      for (const name of (t.do ?? [])) {
        const scope = (name as string) in OPC_ATTEMPT ? attemptScope! : stateScope!;
        OPC[name as keyof typeof OPC](ctx, ev, scope);
      }
      // optional: check invariants(ctx)
    }
    busy = false;
  }

  return {
    send: ctx.sendIn,
    reconnect: () => restartEpoch(ctx)
  };
}
```

## Common Opcode Patterns (with epoch + cleanup baked in)

### Pattern: Async Resource with Timeout (attempt scope) — openWebSocket

```typescript
// Attempt-lived: survives state changes; dies on reconnect
const openWebSocket: AttemptOpcodeFn = (ctx, _ev, sc) => {
  const send = sc.bind(ctx.sendIn);
  const ws = new WebSocket(ctx.wsUrl + '?t=' + ctx.token);
  ctx.ws = { socket: ws, epoch: sc.epoch };

  ws.onopen  = () => send({ type: 'CONNECT.OK' });
  ws.onclose = (e) => send({ type: 'CONNECT.CLOSE', meta: { code: e.code, reason: e.reason } });
  ws.onerror = (e) => send({ type: 'CONNECT.ERROR', meta: { error: e } });

  // Abortable handshake timeout
  const timeoutId = setTimeout(() => {
    if (!sc.aborted) send({ type: 'CONNECT.TIMEOUT' });
  }, 10_000);

  sc.onCleanup(() => {
    clearTimeout(timeoutId);
    if (ctx.ws?.epoch === sc.epoch) {
      try { ws.close(); } catch {}
    }
  });
};
```

### Pattern: Browser API with Cleanup (state scope) — startMic

```typescript
// State-lived: created on entry(listening), cleaned on exit(listening)
const startMic: StateOpcodeFn = async (ctx, _ev, sc) => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  ctx.mic = { stream, epoch: sc.epoch };

  // Optional: notify on track end
  const send = sc.bind(ctx.sendIn);
  stream.getTracks().forEach(t => t.addEventListener('ended', () => send({ type: 'VAD.END' })));

  sc.onCleanup(() => {
    if (ctx.mic?.epoch === sc.epoch) {
      for (const tr of stream.getTracks()) tr.stop();
    }
  });
};

const stopMic: StateOpcodeFn = (ctx, _ev, sc) => {
  if (ctx.mic?.epoch === sc.epoch) ctx.mic.stream.getTracks().forEach(tr => tr.stop());
};
```

### Pattern: Backoff with AbortController (attempt scope) — backoff

```typescript
const backoff: AttemptOpcodeFn = async (_ctx, _ev, sc) => {
  const delay = 500 + Math.random() * 1000; // jitter
  await new Promise<void>(resolve => {
    const id = setTimeout(resolve, delay);
    sc.onCleanup(() => clearTimeout(id));
  });
};
```

**Tip:** Any event wiring from SDKs should use `const send = sc.bind(ctx.sendIn)` so events are auto-tagged with the correct epoch and stale ones are dropped by the runtime.

## Convex Integration (Optional)

### Single Source of Truth: Define Types in Schema

```typescript
// convex/schema.ts
export const SESSION_STATES = [
  "disconnected", "connecting", "idle",
  "listening", "speaking", "recovering", "terminating"
] as const;

export default defineSchema({
  sessions: defineTable({
    userId: v.string(),
    epoch: v.number(),
    status: v.union(...SESSION_STATES.map(s => v.literal(s))),
    lastSeen: v.number(),
  }).index("byUser", ["userId"])
});

// client/voiceSession.ts
import { SESSION_STATES } from "../convex/schema";
type SessionState = typeof SESSION_STATES[number];
// TypeScript now validates against Convex schema ✅
```

### Server-Authoritative Lease

```typescript
// convex/sessions.ts
export const acquireLease = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const existing = await ctx.db
      .query("sessions")
      .withIndex("byUser", q => q.eq("userId", userId))
      .first();

    const epoch = (existing?.epoch ?? 0) + 1;
    if (existing) {
      await ctx.db.patch(existing._id, { epoch, status: "connecting", lastSeen: Date.now() });
    } else {
      await ctx.db.insert("sessions", { userId, epoch, status: "connecting", lastSeen: Date.now() });
    }
    return { epoch };
  }
});

export const heartbeat = mutation({
  args: { epoch: v.number(), state: v.string() },
  handler: async (ctx, { epoch, state }) => {
    const userId = (await ctx.auth.getUserIdentity())!.subject;
    const session = await ctx.db.query("sessions").withIndex("byUser", q => q.eq("userId", userId)).first();
    if (!session || session.epoch !== epoch) return { ok: false, reason: "stale_epoch" };
    await ctx.db.patch(session._id, { lastSeen: Date.now(), status: state as any });
    return { ok: true };
  }
});
```

### Critical Pattern: Fire-and-Forget Audit Logging

```typescript
// NEVER await audit logs - they must be non-blocking
function enterState(ctx: Ctx, next: SessionState, ev: Event) {
  const prev = ctx.state;

  if (stateScope) {
    (exit[ctx.state] ?? []).forEach(op => OPC[op](ctx, ev, stateScope!));
    stateScope.abort();
  }

  ctx.state = next;
  stateScope = new Scope(ctx.epoch);

  // Fire-and-forget (NO await) - returns immediately
  ctx.convex?.mutation(api.sessions.logTransition, {
    epoch: ctx.epoch, fromState: prev, event: ev.type, toState: next, timestamp: Date.now()
  }).catch(err => console.warn('Audit failed:', err));

  (entry[next] ?? []).forEach(op => OPC[op](ctx, ev, stateScope!));
}
```

### Critical Pattern: Parallel Lease Acquisition

```typescript
const acquireLease: AttemptOpcodeFn = async (ctx, _e, sc) => {
  // Start immediately, don't await
  const leasePromise = ctx.convex.mutation(api.sessions.acquireLease, {});
  ctx.leasePromise = leasePromise;

  // Update epoch in background
  leasePromise.then(r => { ctx.epoch = r.epoch; })
    .catch(err => {
      console.error('Lease failed:', err);
      const send = sc.bind(ctx.sendIn);
      send({ type: 'CONNECT.ERROR', meta: { error: err } });
    });
};

const openWebSocket: AttemptOpcodeFn = async (ctx, _e, sc) => {
  // Await lease if not ready yet
  if (ctx.leasePromise) {
    const { epoch } = await ctx.leasePromise;
    ctx.epoch = epoch;
  }

  const ws = new WebSocket(ctx.wsUrl + '?epoch=' + ctx.epoch);
  // ... rest of setup
};
```

### Context Type with Convex

```typescript
type Ctx = {
  state: SessionState; epoch: number; sendIn: (e: Event) => void;

  // Optional Convex client
  convex?: {
    mutation: <T>(fn: any, args: any) => Promise<T>;
    action: <T>(fn: any, args: any) => Promise<T>;
  };

  // Resources
  ws?: { socket: WebSocket; epoch: number };
  mic?: { stream: MediaStream; epoch: number };

  // Promises for parallel ops
  leasePromise?: Promise<{ epoch: number }>;
};
```

## Validator (capability-aware)

### Capability System

```typescript
type Capability = 'Handshake' | 'Channel' | 'Media' | 'Timer';

const capabilities: Record<SessionState, Capability[]> = {
  disconnected: [],
  connecting: ['Handshake', 'Channel'],
  idle: ['Channel'],
  listening: ['Media', 'Channel'],
  speaking: ['Media', 'Channel'],
  recovering: ['Timer'],
  terminating: []
};
```

### Validator Implementation

```typescript
function mustHandle(table: TransitionTable, state: SessionState, events: SessionEvent[]) {
  for (const ev of events) {
    if (!table[state]?.[ev]) {
      throw new Error(`State '${state}' must handle '${ev}' (capability rule)`);
    }
  }
}

export function validate(
  table: TransitionTable,
  capabilities: Record<SessionState, Capability[]>,
  entry: Record<SessionState, readonly string[] | undefined>,
  exit: Record<SessionState, readonly string[] | undefined>
) {
  for (const state of Object.keys(table) as SessionState[]) {
    const caps = capabilities[state] || [];

    // Handshake: must handle timeouts
    if (caps.includes('Handshake')) {
      mustHandle(table, state, ['CONNECT.TIMEOUT']);
    }

    // Channel: must handle disconnects
    if (caps.includes('Channel')) {
      mustHandle(table, state, ['CONNECT.CLOSE', 'CONNECT.ERROR']);
    }

    // Media: must have exit cleanup
    if (caps.includes('Media')) {
      const hasExit = (exit[state] ?? []).some(op => op === 'stopMic' || op === 'stopTts');
      if (!hasExit) throw new Error(`State '${state}' missing exit hook for mic/tts cleanup`);
    }
  }

  // Terminal check
  if (Object.keys(table.terminating ?? {}).length) {
    throw new Error(`'terminating' must have no outgoing transitions`);
  }
}

// Usage
validate(transitions, capabilities, entry, exit);
```

## At-a-Glance (keep at top of file for readability)

### States

- **disconnected** — No session
- **connecting** — Opening WS & provisioning (10s timeout)
- **idle** — Connected, waiting
- **listening** — Mic on (streams)
- **speaking** — Playing agent reply (barge-in ducks)
- **recovering** — Error/backoff
- **terminating** — Final

### Transitions (table)

| From | On | To | Do |
|------|----|----|-----|
| disconnected | USER.START | connecting | acquireLock, openWebSocket |
| connecting | CONNECT.OK | idle | provision |
| connecting | CONNECT.TIMEOUT/CLOSE/ERROR | recovering | backoff |
| idle | VAD.START | listening | |
| idle | AGENT.START | speaking | |
| listening | VAD.END | idle | |
| speaking | AGENT.END | idle | |
| speaking | VAD.START | speaking | duckPlayback |
| any conn | CONNECT.CLOSE/ERROR | recovering | backoff |

*(This table mirrors the transitions object; beginners can edit here first, then mirror changes in code.)*

## React Integration (simple & predictable)

```typescript
// Simple React hook wrapper
function useVoiceSession(runtime: Runtime) {
  const [state, setState] = useState(runtime.getState());

  useEffect(() => {
    return runtime.subscribe(setState);
  }, [runtime]);

  return {
    state,
    send: runtime.send,
    isActive: state !== 'disconnected',
    isConnecting: state === 'connecting' || state === 'recovering',
    isListening: state === 'listening',
    isSpeaking: state === 'speaking'
  };
}

// Usage in component
function VoiceButton() {
  const { state, send, isActive } = useVoiceSession(runtime);

  return (
    <button onClick={() => send({ type: 'USER.START' })}>
      {isActive ? 'End Call' : 'Start Call'}
    </button>
  );
}
```

Expose subscribe or just drive state from the runtime if you prefer. Because ownership is via entry/exit + scopes, React components stay dumb: render by state.

## Review Checklist (pre-merge sanity)

**Required:**

- [ ] **Connection coverage**: All `WITH_CONN` states (connecting|idle|listening|speaking|recovering) handle `CONNECT.CLOSE` and `CONNECT.ERROR`.
- [ ] **Handshake coverage**: All `WITH_TIMEOUT` states (connecting) handle `CONNECT.TIMEOUT`.
- [ ] **Mic ownership**: All `WITH_MIC` states (listening) have `stopMic` in exit hooks.
- [ ] **Terminal hygiene**: `terminating` has an empty transition object.
- [ ] **Epoch tagging**: Every resource stored in `ctx.*` includes `epoch: sc.epoch`.
- [ ] **Cleanup fencing**: Every cleanup checks `ctx.resource?.epoch === sc.epoch` before touching shared handles.

**If using Convex:**

- [ ] **Never await audit logs**: All `ctx.convex.mutation()` calls use `.catch()`, not `await`.
- [ ] **Parallel lease acquisition**: Lease starts immediately, WebSocket awaits promise internally.
- [ ] **All Convex calls have error handlers**: Every Convex call has `.catch()` to prevent unhandled rejections.
- [ ] **Server validates epoch**: Server rejects stale writes with `stale_epoch` error.

**Optional (nice to have, low effort):**

- [ ] Count dropped stale events (dead-letter metric) for observability.
- [ ] Include a short "At-a-glance" transitions table at the top of the file for non-devs.
- [ ] Keep event names namespaced: `CONNECT.*`, `VAD.*`, `AGENT.*`, `USER.*`.

## What the LLM Edits

LLMs edit only:
- `transitions` (table above)
- `entry` / `exit` hook maps

Everything else (runtime, scopes, validator) remains **stable boilerplate**.

## Decision Criteria: When to Use State Machines

### ✅ USE State Machines When:

**1. Complex Session Lifecycle**
- Multiple connection modes (text, voice, video)
- Retry/recovery logic with backoff
- Cross-tab coordination
- **Example:** ElevenLabs voice/text session management

**2. Critical Resource Management**
- Resources have strict cleanup requirements
- Dependencies between resources (must close in order)
- Risk of leaks has high cost (billing, privacy)
- **Example:** WebSocket + microphone + audio playback

**3. Stale Event Problems**
- Events from old sessions interfere with new ones
- Rapid mode switching creates race conditions
- **Example:** Text disconnect events during voice startup

**4. LLM Code Generation**
- Spec has 10+ transitions
- Multiple error scenarios
- Performance tier ≥ 2 (session lifecycle enforcement)
- **Example:** Any Process spec with retry logic

### ❌ DO NOT Use State Machines When:

**1. Simple Components (< 5 states)**
- Linear flow with few branches
- No retry logic
- **Example:** Form submission (idle → submitting → success/error)
- **Use instead:** Regular React hooks with useState

**2. UI-Only State**
- No external resources to manage
- No cross-tab coordination
- **Example:** Modal open/closed, accordion expanded/collapsed
- **Use instead:** Local component state

**3. Rapid Prototyping**
- Need to ship quickly
- Requirements still changing
- **Example:** MVP feature exploration
- **Use instead:** Imperative code, refactor later if it becomes complex

### Decision Tree

```
Is this a Process spec with:
  - ≥10 transitions? OR
  - ≥3 resources with dependencies? OR
  - Retry/recovery logic? OR
  - Cross-tab coordination? OR
  - Performance tier ≥2?
    ├─ YES → Use state machine ✅
    └─ NO → Use React hooks ✅
```

## Summary

**This guide provides:**
- Minimal LLM edit surface (transitions + entry/exit only)
- Stable boilerplate (scope, runtime, validator)
- P0 bug prevention (dual scopes, exit hooks, epoch guard)
- Clear patterns for common operations
- Pre-merge checklist for validation

**Time per state machine:** ~30-45 min (LLM generation + human review)

**Best for:** 3-10 complex state machines requiring strict resource management and stale event prevention.

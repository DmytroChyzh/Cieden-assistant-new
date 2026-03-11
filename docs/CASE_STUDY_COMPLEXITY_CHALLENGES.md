# FinPilot Case Study: Rapid AI‑Led Prototyping, Real‑World Complexity, and What It Means for Your Product

> Audience: Product leaders and founders seeking a design partner who can rapidly prototype with AI to validate concepts and de‑risk build decisions.
> Approach: AI‑led prototyping guided by a design CEO (non‑developer), with zero hand‑written code by the CEO — everything orchestrated via prompts, design intent, and rigorous acceptance criteria.

---

## Why This Case Study Matters

You don’t need a large engineering team to validate ambitious product ideas. With the right design partner, AI can generate production‑grade prototypes quickly — while we focus on strategy, user journeys, constraints, and guardrails. FinPilot is our proof: a voice‑powered financial assistant with real‑time data sync and interactive visual tools, built through AI‑led prototyping and design‑driven orchestration.

What you’ll see below is both: (1) how we used AI to ship an end‑to‑end working prototype fast, and (2) the non‑trivial, real‑world complexities we solved so you don’t have to. This is how we help teams validate product direction in weeks, not quarters.

---

## Highlights — What We Built Fast (And Why It’s Hard)

- Voice + Text multimodal assistant using ElevenLabs React SDK, with real‑time Convex persistence and CopilotKit chart actions.
- 11 unified “client tools” that the AI can call to render rich UI (balance, credit score, EMI, loans, lending options, charts, quizzes, documents) with a message‑as‑protocol pattern for resilience.
- Cross‑tab session locking to prevent duplicate voice sessions and billing across multiple browser tabs — including stale session cleanup and forced handoff.
- Streaming transcripts pipeline (start, update, finalize) with message promotion on completion and automated cleanup.
- Robust visual system: speaking HUD, voice‑reactive backgrounds, and mobile‑first layout with SSR/hydration safety.

Proof in code (clickable):
- Provider + session lifecycle: `src/providers/ElevenLabsProvider.tsx:1`
- Tool bridge + types: `src/utils/toolBridge.ts:1`
- Unified tool config (11 tools): `src/config/elevenLabsTools.ts:1`
- TOOL_CALL parsing: `src/utils/parseToolCall.ts:1`
- Chat page + action handlers: `app/voice-chat/page.tsx:1`
- Convex streaming + schema: `convex/streaming.ts:1`, `convex/schema.ts:1`

---

## Our Method — AI‑Led, Design‑Guided Prototyping

We treat prompting as a creative engineering interface. Our CEO led the prototyping by specifying user goals, states, constraints, and success criteria. AI generated the scaffolding and code, while our design & engineering practice provided:

- Prompt architecture: system prompts, patterns, examples, acceptance tests.
- Guardrails: architecture docs, typed interfaces, error boundaries, and migration plans.
- Iteration loops: instrumented logs, debug pages, and test routes for fast validation.
- Vendor reality checks: reproduce SDK issues with minimal repros; add stable fallbacks.

Result: zero hand‑written code by the CEO; consistent design intent across the stack; and a working, demoable prototype that proves feasibility and uncovers risks early.

---

## Complexity We Solved So You Don’t Have To

1) Transport lifecycle (WebRTC voice + WebSocket text)
- Single‑active‑transport model; explicit `startText/stopText` and `startVoice/stopVoice` with readiness promises and timeouts.
- Per‑mode message/error handlers; normalized inbound events; buffered persistence.
- Outcome: text replies < 1–2s, voice connect ~3s (down from ~7s), stable switching.

2) Cross‑tab session coordination (billing and stability)
- LocalStorage “lock” + BroadcastChannel heartbeats and handoffs; stale cleanup after 30s.
- UX reflects “Active in another tab”; safe reclaim on close.
- Code: `src/utils/crossTabSession.ts:1` integrated in provider.

3) Tool protocol and render safety
- Message‑as‑protocol (`TOOL_CALL:toolName:JSON`) with strict parsing, modes (default/update/overlay), and typed handlers.
- Unified 11‑tool config to eliminate drift; consistent naming across `snake_case`/`camelCase`/`PascalCase`.

4) Streaming transcripts done right
- Start/update/finalize streams, promote final text to messages, and periodic cleanup.
- Use streaming only for speech, never for static data (documented anti‑patterns).

5) Visual and SSR stability
- HUD anchored reliably with ResizeObserver + MutationObserver + fixed fallbacks; dynamic import to avoid hydration mismatch; mobile safe‑area tuning.

6) Vendor edge cases (documented and mitigated)
- ElevenLabs “text_only” override bug: agent ignored overrides across WS/WebRTC/SDK. We built minimal repros, filed a report, and documented workarounds (dual agents / defaults). See `docs/archive/bugs/ELEVENLABS_TEXT_ONLY_BUG_REPORT.md:1`.

---

## Outcomes & Proof Points

- Prototype speed: functional multimodal assistant in weeks, not months.
- Stability: unified provider manages both modes with buffered persistence and cross‑tab ownership; no “lost messages” during session churn.
- Extensibility: adding a new AI tool now follows a documented, 3‑step checklist with type‑safe handlers and rendering patterns.
- Observability: structured logs for session start/stop, tool calls, and parsing errors enable fast diagnosis.

Representative wins
- Voice connect latency ~3s (ICE relay tuning).
- Text reply reliability: <2s round‑trip; no per‑message reconnects.
- Quiz updates moved to silent “update” mode; visible UI noise eliminated.

---

## What This Means For Your Project

- Validate the right problem faster: We align on user journeys and constraints, then let AI generate working software that exercises the real risks (auth, latency, persistence, vendor quirks).
- Keep the good, discard the bad: The prototype is both a live demo and a learning artifact — you can keep the system patterns and throw away the experimental parts.
- Design stays in the driver’s seat: We translate design goals and flows into prompts, acceptance criteria, and code architecture, ensuring fidelity to the intended UX.

Engagement model (typical 2–3 weeks)
- Week 1: Scope, prompt strategy, initial end‑to‑end demo, risk register.
- Week 2: Hardening (transport lifecycle, session ownership), 3–5 high‑value tools, analytics hooks.
- Week 3 (optional): Visual polish, mobile behaviors, and stakeholder walkthrough with metrics.

---

## Risks & Mitigations We Already Handle

- Vendor API gaps: we create minimal repros, document issues, and add safe fallbacks (e.g., dual‑agent strategy for text‑only).
- Session duplication & billing: cross‑tab locks, heartbeats, and forced handoff.
- SSR/hydration: client‑only renders for visual overlays; dynamic imports for stability.
- Security & config: no secrets in repo; auth‑gated routes; environment validation with clear logs.

---

## Technical Appendix (for your engineering partners)

- Provider and lifecycle: `src/providers/ElevenLabsProvider.tsx:1`
- Tool bridge and types: `src/utils/toolBridge.ts:1`
- Unified client tools (11): `src/config/elevenLabsTools.ts:1`
- Message parsing: `src/utils/parseToolCall.ts:1`
- Chat actions and handlers: `app/voice-chat/page.tsx:1`
- Convex schema and streaming: `convex/schema.ts:1`, `convex/streaming.ts:1`
- Architecture and patterns: `docs/active/ARCHITECTURE.md:1`, `docs/active/TECHNICAL_REFERENCE.md:1`

---

## Call To Action

If you need a design partner who can turn ambiguity into a working, AI‑powered prototype rapidly — and surface real constraints early — we’d love to collaborate. We’ll bring the same AI‑led, design‑guided rigor that built FinPilot to your product idea and have you demo‑ready in weeks.

• Share your goals → we propose a 2‑week plan
• We build a working prototype with real constraints
• You get clarity on feasibility, scope, and next steps

Let’s validate your next product faster — with AI doing the heavy lifting and design driving the outcomes.


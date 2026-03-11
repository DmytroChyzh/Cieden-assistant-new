# Demo Fix Summary and Implementation Context

> Purpose: Single source of truth for issues observed, decisions made, and concrete implementation tasks for the next session. Target demo use-case: Laptop purchase (≈ ₹25,000 / $2,000), simple EMI explanation, and clean lending options.

## Current Issues (Observed)

1) Lending options mismatch the demo scenario
- Symptom: Cards show values like ₹300,000, multi-period EMIs, and generic fees.
- Root cause(s):
  - Options generated from quiz answers used upper bound (e.g., 300000) instead of the demo target (₹25,000).
  - `LendingOptionsCard` renders fee rows unconditionally and displays EMI split even when not provided.
- Impact: Confusing/non-demo-aligned offer presentation.

2) Quiz auto-advance inconsistency (agent path)
- Symptom: After `selectOption`, the quiz sometimes doesn’t advance, or advances unexpectedly.
- Root cause(s):
  - Auto-advance increments by index, not by answered `question_id`. If the agent answered a non-current step, index can desync.
  - Dual triggers: LLM may send `nextQuestion` right after `selectOption`, fighting the scheduled auto-advance.
  - Potential replays avoided now via dedup but path alignment by `question_id` still needed.
- Impact: Unreliable progression during agent-driven flow.

3) EMI contextual noise / unrelated logs
- Symptom: Repeating “EMI contextual update…” logs long after the card is off-screen; volume logs spam.
- Status: Muted/gated. Keep QUIZ_NAV logs only.

4) Inconsistent completion path (agent vs manual)
- Symptom: Manual flow closes quiz and shows lending options; agent flow previously showed Results page.
- Status: Unified to dispatch lending options on agent completion and request overlay close.

5) ElevenLabs tool usage ambiguity
- Symptom: Agent sometimes picks wrong option or issues `nextQuestion` immediately after `selectOption`.
- Status: Tool schema updated; dynamic vars recommended (current_question_id, options_for_current) to reduce ambiguity.

## Key Decisions (Architecture)

- Modes: `update` (silent), `overlay` (full-screen). All update_quiz messages use mode=update; UI filters them.
- Transport: Convex contextual messages for cross-tab and agent-driven updates; DOM events only for same-tab convenience.
- State owner: `QuizProvider` consumes update messages, dedups identical updates, and performs progression.
- Logging: Consolidated QUIZ_NAV logs for step transitions; noisy logs gated/off.

## Demo Defaults (Authoritative)

- EMI (when agent omits params):
  - loanAmount: ₹25,000; interestRate: 0% p.a.; termMonths: 10; emi: ₹2,500; currency: INR; simpleExample: true.
- Lending Options (when options omitted): three plans for ₹25,000
  - Promo Fixed 10m (0%): EMI ≈ ₹2,500; totalInterest: 0; fee: 0; recommended: true
  - Fixed 12m (12%): EMI and total interest computed; processing fee: ₹250
  - Flexi 6m (14%): EMI and total interest computed; flexi fee: ₹199; prepayment allowed

## Required Code Changes (Next Session)

A) Lending options rendering clean-up
- File: `src/components/charts/LendingOptionsCard.tsx`
- Tasks:
  - Render EMI split only if `emiStructure` is provided; otherwise show a single Monthly EMI block.
  - Make fee rows optional; render only when present on option object (`processingFee`, `flexiFee`, `maintenanceFee`).
  - Ensure currency formatting respects `data.currency` (pass-through from message).

B) Quiz auto-advance alignment by question_id
- File: `src/components/quiz/QuizProvider.tsx`
- Tasks:
  - On `selectOption`, determine the step index by matching `question_id` within `currentQuiz.questions`.
  - Snap `currentQuestion` to that index (if different), then schedule a single auto-advance to index + 1.
  - Keep dedup logic; ignore repeated identical updates.
  - Continue discouraging agent from sending `nextQuestion` immediately after `selectOption`.

C) Provider completion payload consistency
- File: `src/components/quiz/QuizProvider.tsx`
- Tasks:
  - Replace computed lending options on agent completion with the same three demo plans used in the handler (₹25k Promo/Fixed/Flexi), to ensure the same story regardless of path.
  - Continue to request overlay close instead of showing Results page.

D) EMI renderer stability (already partially done)
- File: `src/components/chat/ToolCallMessageRenderer.tsx`
- Tasks:
  - Keep defaulting to demo EMI values only when inputs are missing/invalid; never override valid incoming values.

E) Handlers (already partially done)
- File: `app/voice-chat/page.tsx`
- Tasks:
  - `show_emi_info`: if agent omits params, inject demo EMI defaults.
  - `show_lending_options`: if agent omits options, inject three demo plans and INR currency; include minimal `userProfile`.

F) Agent tool schema and guidance (context only)
- Ensure update_quiz tool doc includes exact `question_id` and `selected_value` enums and clearly states: do not send `nextQuestion` after `selectOption`.
- Provide dynamic variables: `current_question_id`, `current_question_index`, `total_questions`, `options_for_current`.

## Test Plan

1) EMI demo:
- Call `show_emi_info` without params → Expect INR, ₹25,000, 0%, 10m, ₹2,500.
- Provide custom values → Renderer uses provided values, not defaults.

2) Lending options demo:
- Call `show_lending_options` without options → Expect Promo 10m, Fixed 12m, Flexi 6m; omit fee rows unless provided.
- Expanded card shows a single Monthly EMI unless `emiStructure` is explicitly provided.

3) Quiz flow:
- Manual: Selecting options auto-advances 1.5s later; after last step, quiz closes and shows demo lending options.
- Agent: update_quiz messages (mode=update) cause the same outcomes; no Results page; overlay closes; lending options appear.
- Stress: Send select for step N while current is step M → Provider snaps to N, schedules single advance.

4) Logging:
- Console shows QUIZ_NAV entries only for quiz state transitions.
- No volume spam; no repeating EMI contextual prints.

5) Build & Deploy:
- `npm run build` passes locally.
- Vercel deployment reflects changes.

## Risks & Mitigations

- Risk: Agent sends `nextQuestion` immediately after `selectOption`.
  - Mitigation: Tool guidance + provider guards (advance by `question_id`, ignore extra next).
- Risk: Demo defaults leak into non-demo runs.
  - Mitigation: Defaults only applied when params/options missing; renderer preserves provided values.
- Risk: UI regression in `LendingOptionsCard` with optional rows.
  - Mitigation: Snapshot visual test and quick manual pass across 3 options.

## Rollback Plan

- Revert to commit prior to demo defaults injection.
- Disable provider completion trigger (show Results page again) if needed.

## Pointers to Relevant Files

- `app/voice-chat/page.tsx` — tool action handlers, Convex message creation.
- `src/components/chat/ToolCallMessageRenderer.tsx` — tool-to-UI mapping; EMI defaults.
- `src/components/quiz/QuizProvider.tsx` — quiz update handling, dedup, auto-advance, completion.
- `src/components/charts/LendingOptionsCard.tsx` — options presentation.
- `src/components/chat/LendingOptionsMessage.tsx` — wrapper.

---
This document captures the agreed demo defaults, the exact issues, the rationale, and the concrete steps. Use it as the kickoff guide for the next implementation session to avoid regressions and keep the demo narrative consistent.







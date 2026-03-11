# Reuse Audit

## Overview
I sampled the client, shared, and UI helper layers and looked for places where a shared primitive either lives in multiple copies or is only defined once but not consumed. The findings below describe those gaps, point to the files involved, and call out whether each gap is critical (risks visible inconsistency or bugs) or nice-to-have (cleanup, unused code removal).

## Findings

1. **Card primitive is defined twice but only one copy is effectively used (critical).**
   - `components/ui/card.tsx` (lines 1‑68) defines the canonical `Card` family that the rest of the app imports using `@/components/ui/card`. It is wired into almost every route, chart card, and dashboard widget (e.g., `src/components/charts/*.tsx`, `app/page.tsx`, `components/customer-engagement/*`).
   - `src/components/ui/card.tsx` mirrors the exact same code but is only referenced in `src/components/charts/DocumentIdCard.tsx` (lines 8‑20) via `@/src/components/ui/card`. That single import means there are two sources of truth for the same primitive. Any change to card styling or props must be duplicated, which is a bug/consistency risk for this core layout primitive.
   - *Severity: Critical* — this primitive is everywhere; duplication can drift and produce inconsistent cards in a production experience.
   - Suggestion: convert `DocumentIdCard.tsx` to import from the root `@/components/ui/card` and delete the `src/components/ui/card.tsx` copy.
   - Remediation (2025-11-29): `DocumentIdCard.tsx` now imports `@/components/ui/card`, and `src/components/ui/card.tsx` has been removed to keep a single source of truth.

2. **Chart primitive exists twice but only the root copy is used (nice-to-have).**
   - `components/ui/chart.tsx` is the implementation pulled into `src/components/charts/BalanceCard.tsx`, `ChartDisplay.tsx`, and `ChartMessage.tsx` via `@/components/ui/chart`.
   - The `src/components/ui/chart.tsx` file duplicates the same logic but has zero references (`@/src/components/ui/chart` is not imported anywhere). This dangling copy increases bundle size and slows maintenance because it is easy to forget when updating chart theming.
   - *Severity: Nice to have* — the duplicate is dead code rather than conflicting, so cleaning it up is low risk but worthwhile.
   - Suggestion: delete `src/components/ui/chart.tsx` and ensure no new code references the `@/src/components/ui` path for charts.
   - Remediation (2025-11-29): Removed `src/components/ui/chart.tsx` after confirming no code referenced the duplicate.

3. **`useClickOutside` hook is duplicated but only the root hook is wired up (nice-to-have).**
   - `hooks/use-click-outside.ts` (lines 1‑25) is imported by `src/components/ui/morphing-dialog.tsx` and any other component that needs the behavior via `@/hooks/use-click-outside`.
   - `src/hooks/use-click-outside.ts` is a line-by-line copy of that hook but is never imported (no `@/src/hooks/use-click-outside` references exist). It only sits in the repo, creating confusion about which hook to use.
   - *Severity: Nice to have* — removing the unused copy and pointing any future code to the root hook reduces maintenance.
   - Suggestion: delete `src/hooks/use-click-outside.ts` and keep the single hook at `hooks/use-click-outside.ts`; update any stray `@/src/hooks` imports if they appear later.
   - Remediation (2025-11-29): Deleted `src/hooks/use-click-outside.ts`, leaving the root hook as the sole implementation.

## Summary
The main reuse gaps come from maintaining parallel versions of UI primitives and a hook inside `src/` when the canonical implementation lives at the repo root. Aligning all imports to the root locations (and deleting the stray copies) removes duplication, reduces the chance of divergence, and makes code ownership clearer.

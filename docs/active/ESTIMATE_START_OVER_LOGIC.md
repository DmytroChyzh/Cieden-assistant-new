# Estimate Start Over Logic (Locked Behavior)

This document fixes the expected behavior for the estimate flow.
Rule: keep existing stable logic, only add minimal changes on top.

## Current working baseline

- `Work with the assistant` mode already works and must not be rewritten.
- Existing estimate orchestration (`cancel`, `assistant progress`, panel visibility) must stay unchanged.
- New changes must be additive and isolated.

## Start over behavior (required)

When user is in assistant estimate flow and clicks `Start over`:

1. Current estimate session is reset.
2. Previously collected estimate answers/questions are cleared.
3. The estimate flow starts again from question 1.
4. Old in-progress context must not continue into the new run.
5. Quick mode behavior remains unchanged.

## Safety constraints for future edits

- Do not refactor `app/voice-chat/page.tsx` estimate orchestration unless explicitly requested.
- Do not replace existing cancel flow; reuse stable reset path.
- Any new restart logic must be wired through current working events/state flow.
- Validate manually after each change:
  - assistant starts questions normally,
  - `Start over` returns to question 1,
  - no duplicated panels or frozen progress.

# Chat Logic Invariants

These invariants define non-negotiable behavior for the Cieden chat UX. Any change that violates them is a regression.

## Core Conversation Invariants

- First greeting appears once per thread and must not duplicate mid-flow.
- Assistant text must not duplicate within the same user segment.
- Duplicate tool rows with identical payload must be collapsed.
- Welcome hub remains stable and should not be unexpectedly replaced by legacy intro bubbles.
- Voice mode must still render transcript in chat: both user speech and assistant speech are visible as written messages.

## Voice Onboarding Invariants

- After selecting a voice, the UI returns to the welcome block (`Welcome — your Cieden assistant is here`) with large suggestion buttons.
- In voice onboarding, the assistant starts speaking and suggestion buttons reveal progressively.
- Before the first user message, switching between text and voice must reset the onboarding UI cleanly (no mixed blocks).

## Estimate Flow Invariants

- Estimate mode is isolated: onboarding-style assistant questions are filtered out while estimate collection is active.
- Estimate entry card is mandatory at estimate start (the preliminary estimate card with cancel action must stay visible).
- During estimate flow, only estimate-entry tool calls (`open_calculator`, `generate_estimate`) are allowed.
- Non-estimate tool cards must not appear during active estimate Q&A.
- Estimate chooser boilerplate text is suppressed; real estimate scoping questions remain visible.
- While estimate session is active, chat content is limited to estimate-related assistant questions and user project answers (no unrelated cards/messages).
- After estimate final result is shown, CTA text must be `Book Call`, and opening booking form should prefill `Tell us about your project` with the collected project summary from estimate session.
- Any direct `Book Call` entry (quick prompts, tool cards, suggestions) must launch the estimate questionnaire first, then open booking form with prefilled project summary, without resetting or hiding existing chat history.

## Tool Card + Follow-up Invariants

- For non-estimate cards, the user must see assistant follow-up context (native or fallback companion text).
- Estimate entry cards are exempt from generic card follow-up text to avoid noisy estimate UX.
- Quick-reply chips should be suppressed when the context requires strict focus (estimate, completed estimate segment, email gate prompts).

## Side Panel Invariants

- Only one right-side panel may be open at any moment.
- Opening any panel must close other right-side panels first.
- Panel-open events from cards and quick prompts follow the same exclusivity rule.

## Email Gate Invariants

- General email gate activates only after configured user-message threshold.
- Estimate flow must not be interrupted by general gate while estimate session is active.
- Email gate prompts are sent as assistant messages in chat (no inline warning noise under input).

## Test Policy

- Critical invariants must have automated tests in `src/**/*.spec.ts`.
- Regressions must be fixed with a targeted test before or along with the code fix.
- Chat-specific checks should be run with `npm run test:chat` after each substantive change.

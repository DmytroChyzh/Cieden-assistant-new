# Plan: Fix Quiz UI/UX Issues

## 1. Start Quiz Mismatch (Fix "Start" Button)
**Problem:** When the agent starts the quiz, the UI shows a "Start Quiz" button card instead of the first question, confusing the user.
**Fix:** `QuizMessage.tsx` now initializes `isExpanded` to `true`. This ensures that when the `start_quiz` tool renders the component, it immediately shows the active quiz (Question 1).

## 2. Duplicate User Messages (Fix "I selected...")
**Problem:** "I selected option..." messages appear twice (once from local echo/Convex, once possibly from Agent echo or just redundant display).
**Fix:** `VoiceChatPage.tsx` now filters out `role: 'user'` messages that start with "I selected:" from the rendering list. The agent still receives them (for context), but the user sees only the UI update (highlighted option), preventing clutter.

## 3. Navigation Regression (Fix "Jump Back")
**Problem:** After the quiz completes and processing ends, the UI reverts to the last question (Step 5) because the modal doesn't close.
**Fix:** `QuizMessage.tsx` now listens to `quizState.closeRequestedCounter`. When `QuizProvider` calls `requestCloseOverlay()` (at the end of the voice flow), `QuizMessage` responds by setting `isExpanded(false)`, correctly closing the modal and revealing the chat stream (which contains the results).

## 4. Duplicate Lending Options (Fix Double Cards)
**Problem:** Lending options appear twice.
**Fix:**
*   **Race Condition:** The "Double Trigger" (Click vs Voice) was fixed in `QuizProvider.tsx` (guards added in previous step).
*   **Modal Closure:** Fixing the "Jump Back" issue (Issue #3) also helps here. Previously, the user might have seen options in the *background* (chat) while the modal (foreground) was still open or glitching. Closing the modal cleanly ensures only the chat stream result is visible.

## 5. Future Work — Prevent Agent from re-triggering Lending Options
**Problem:** After the quiz completes, the agent lacks visibility into the calculated offers and calls `show_lending_options` again, sending a second (generic) card.
**Plan:**
1.  **Update tool guidance (no code yet):**
    * File: `tool_configs/show_lending_options.json`.
    * Expand the `description` and/or add a `usage_hint` block instructing the agent:
      - “Do not call this tool right after the quiz. The UI automatically renders personalized options; wait for the QUIZ_LENDING_OPTIONS_READY contextual update.”
      - Reserve this tool for manual/standalone requests outside the guided quiz.
2.  **Provide the agent with the computed results:**
    * Files impacted: `src/components/quiz/QuizComponent.tsx` or `src/components/quiz/QuizProvider.tsx`, plus `app/voice-chat/page.tsx`.
    * After the quiz calculates loan options (where we currently call `onUserAction('TOOL_CALL:showLendingOptions:…')`), also send a contextual payload (e.g., `QUIZ_LENDING_OPTIONS_READY` JSON) through `handleUserAction` or `sendContextualUpdate`.
    * This payload includes plan title, APR, payment, term, etc., so the agent can summarize the exact numbers without invoking the tool.
3.  **Verification:**
    * Confirm that when the quiz ends, only one lending card appears (the personalized one rendered by the UI) and the agent references those numbers verbally.
    * Ensure the agent still has the tool available if the user later says “show me alternative programs” outside the quiz.

## 6. Future Work — Rethink Quiz Card vs. Full-Screen Flow
**Problem:** Showing the compact “Start Quiz” card while already auto-opening the modal feels redundant and creates clutter (multiple quiz cards stack up in chat).
**Options under consideration (no code yet):**
1.  **Full-screen only, no inline card:**
    * Update `QuizMessage.tsx` so that when the agent invokes `start_quiz`, we render only the full-screen modal.
    * Once the quiz ends (or the user closes it), the entry disappears; if the agent needs another quiz, it sends a new `start_quiz` tool call.
    * Pros: clean chat history, no “Start” distraction. Cons: user cannot re-open the older quiz without a fresh tool call.
2.  **Two-phase card with explicit user consent:**
    * Revert the auto-open behavior and instead teach the agent (via prompt/tool description) to explicitly ask the user to press “Start” before asking Question 1.
    * Minimizes sudden modal opening but brings back the original alignment issue between agent and UI.
3.  **Hybrid summary card:**
    * Keep a lightweight card that appears after completion, showing “Quiz completed at HH:MM” with a “Retake quiz” button (which would trigger a new `start_quiz` call).
    * During the active session, render only the modal; after closure, render a compact summary card for reference.
**Implementation checklist (once a direction is chosen):**
    * `src/components/chat/QuizMessage.tsx` – adjust render flow to either hide the card during active sessions or remove it entirely.
    * `src/components/quiz/QuizComponent.tsx` – ensure `onUserAction('CLOSE_QUIZ_MODAL')` resets state that the chat renderer can observe (e.g., a `quizInstanceId`).
    * `app/voice-chat/page.tsx` – optionally add metadata to Convex messages so future replays can link back to the quiz summary card.

## Summary of Changes
1.  **`src/components/chat/QuizMessage.tsx`**:
    *   `useState(true)` for auto-expand.
    *   `useEffect` on `closeRequestedCounter` for auto-close.
2.  **`app/voice-chat/page.tsx`**:
    *   Added filter: `if (message.role === 'user' && message.content.startsWith('I selected:')) return false;`.
3.  **`src/components/quiz/QuizProvider.tsx`** (Previous Step):
    *   Added `isProcessing` and `answers[id] === val` guards to prevent duplicate completion flows.

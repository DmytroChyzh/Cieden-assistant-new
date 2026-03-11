# Plan: Fix Quiz Completion, Agent Awareness, and Visual Feedback

## 1. Fix Quiz Completion Flow (Last Stage Bug)

**Problem:** When the user answers the last question via voice, the quiz closes immediately instead of showing the calculation/processing screen.
**Root Cause:** `QuizProvider.tsx` explicitly calls `requestCloseOverlay()` when the last question is answered via the `update_quiz` tool. This diverges from the manual click behavior in `QuizComponent.tsx` which calls `startProcessingFlow()`.

**Implementation Details:**
*   **File:** `src/components/quiz/QuizProvider.tsx`
*   **Status:** ✅ Implemented
*   **Changes:**
    *   Refactored `processQuizUpdate` to replicate `startProcessingFlow` logic.
    *   Used `startProcessing()` helper (moved to top of file).
    *   Implemented stage transitions (analyzing -> calculating).
    *   Used `generateLendingOptionsFromAnswers(newAnswers)` to ensure correct options generation with the latest answer.
    *   Dispatched `TOOL_CALL:showLendingOptions` before closing overlay.

## 2. Fix Agent Context Awareness (Silent Agent)

**Problem:** The agent receives user selections as "system context" and often ignores them, failing to reply or acknowledge the selection.
**Root Cause:** `onUserAction` currently sends data to `sendContextualUpdate`, which creates a `role: 'system'` message. LLMs treat this as background info.

**Implementation Details:**
*   **File:** `app/voice-chat/page.tsx`
*   **Status:** ✅ Verified (Already implemented)
*   **Changes:**
    *   `handleUserAction` checks for "Selected" prefix.
    *   Uses `sendProgrammaticMessage` to send as user message ("I selected ...").
    *   Maintains `sendContextualUpdate` for other system events.

## 3. Improve Visual Feedback (Click Effect)

**Problem:** Voice selections lack the tactile "click" animation, making it hard to see what happened.
**Root Cause:** `QuizQuestion.tsx` uses static conditional styling. Animations only trigger on hover/tap events, which don't fire for voice updates.

**Implementation Details:**
*   **File:** `src/components/quiz/QuizQuestion.tsx`
*   **Status:** ✅ Verified (Already implemented)
*   **Changes:**
    *   Used declarative `animate` prop on options: `animate={selectedAnswer === option.value ? { scale: [1, 1.05, 1] } : {}}`.
    *   This is cleaner than the proposed `useEffect` approach and works correctly with Framer Motion.

## Summary of Files Edited/Verified
1.  `src/components/quiz/QuizProvider.tsx` (Major logic fix)
2.  `app/voice-chat/page.tsx` (Verified)
3.  `src/components/quiz/QuizQuestion.tsx` (Verified)

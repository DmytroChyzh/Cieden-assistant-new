# UI Improvements Integration Plan

**Date:** 2025-01-XX  
**Type:** UI Enhancement  
**Status:** Ready for Implementation  
**Confidence:** 95%+

## Objective

Integrate UI styling improvements from Volodymyr's PR branches:
1. **Chat Input Improvements** - Darken background, auto-expand textarea
2. **Message Card Figma Spec** - Apply design system styling (background, border, shadow)
3. **Card Restyling** - Unified styling across all financial cards

---

## Scope

### ✅ In Scope
- Message card styling (PR-6): Background, border, border radius, box shadow, padding, max width
- Chat input improvements (PR-8): Darken background, auto-expand textarea
- Card restyling (PR-11): Unified black background with blue borders across 10 card components

### ❌ Out of Scope
- Logo/icon changes (user has existing logo)
- Profile photos in messages
- Action buttons in messages
- Voice background animations (deferred)
- Quick actions drawer changes (minor/cosmetic)

---

## Prerequisites & Baseline Validation

- [ ] Confirm local branch is synced with the latest `main` and create `feat/ui-improvements-volodymyr` off that baseline before modifying files.
- [ ] Capture reference screenshots (desktop + mobile) for chat input, message cards, and each affected financial card to enable visual regression comparison after styling updates.
- [ ] Document current behavioral expectations: voice mode disabling, enter-to-send shortcuts, card animations, carousel scroll behavior, etc.
- [ ] Verify shared design tokens defined in `NormalMode.tsx` (`--stroke-dark-blue`, `--background-chips-buttons-grey-15`, etc.) and Tailwind config values so new styles stay consistent with existing design language.
- [ ] Audit related components (`src/components/unified/UnifiedChatInput.tsx`, `components/ui/card.tsx`, `src/components/charts/__*__.tsx`) for props or shared utilities that could be impacted to avoid hidden regressions.

---

## Implementation Tasks

### Task 1: Chat Input Improvements (PR-8)

#### 1.1 Darken Input Background
**File:** `src/components/unified/NormalMode.tsx`

**Current State:**
- Desktop: `bg-white/10 dark:bg-white/5`
- Mobile: `var(--background-chips-buttons-grey-15)` which is `rgba(163, 161, 161, 0.15)`

**Action:**
- [ ] Audit the `data-waveform-anchor` container in `NormalMode` to catalogue current Tailwind classes (`bg-white/10`, `hover:bg-white/15`, border tokens) and inline overrides so that both desktop and mobile code paths are explicitly documented before changes.
- [ ] Define the updated desktop background palette (target `bg-white/5`–`bg-white/8` range) including matching `hover`, `focus-visible`, and `dark:` variants; document resulting class names in this plan to minimize guesswork during implementation.
- [ ] Ensure the inline `style` block keeps the mobile-specific background (`var(--background-chips-buttons-grey-15)`) isolated; verify tablet breakpoints do not accidentally inherit the desktop styling via shared classes.
- [ ] Evaluate contrast for recording/call ring states (`ring-blue-400/50`, red disconnect gradient) against the darker backdrop and note any adjustments that may be necessary (e.g., increasing opacity or adding outline).
- [ ] Plan a quick regression sweep covering the Quick Actions trigger, mute/voice buttons, error badge, and tooltip backgrounds so that iconography remains legible on the darker fill.

**Verification:**
- [ ] Input is clearly visible against dark background
- [ ] Text remains readable
- [ ] No contrast issues
- [ ] Hover/focus/recording states remain visually distinct in both light and dark modes

#### 1.2 Auto-Expand Textarea
**File:** `src/components/unified/NormalMode.tsx`

**Current State:**
- Uses `<input>` element (line 150+)
- Fixed height: `54px` (desktop), `56px` (mobile)

**Action:**
- [ ] Replace the `<input>` with a `<textarea>` while keeping props consistent (`value`, `onChange`, `onKeyDown`, `placeholder`); update `inputRef` typing to `useRef<HTMLTextAreaElement>` and confirm no other functions rely on `HTMLInputElement`-specific APIs.
- [ ] Add a `useLayoutEffect` (rather than `useEffect` to avoid visual flicker) that resets the textarea height to `auto`, reads `scrollHeight`, clamps to `200px`, and toggles `overflowY`; memoize constants for desktop (`54px`) and mobile (`56px`).
- [ ] Ensure height resets immediately after `onSendText` clears state by running the auto-resize routine in the same tick (consider invoking via `requestAnimationFrame` if necessary) so the pill shrinks without lag.
- [ ] Preserve keyboard ergonomics: maintain submit-on-Enter for single-line messages, allow `Shift+Enter` for line breaks, and explicitly test IME composition so multi-byte input isn’t prematurely submitted.
- [ ] Validate accessibility attributes (`aria-label`, autoFocus behavior if any) and ensure screen readers still announce the control correctly after switching elements.
- [ ] Confirm flex layout continues to vertically center the mic/send button cluster as the textarea grows; plan padding tweaks (`py-2` vs `items-start`) if expansion causes misalignment.
- [ ] Re-run voice mode scenarios (recording active, daily limit error) to confirm the textarea respects disabled or read-only states and doesn’t break the waveform positioning.

**Verification:**
- [ ] Textarea expands with long text
- [ ] Max height constraint works (200px)
- [ ] Scrollbar appears when max height exceeded
- [ ] Height resets when text cleared
- [ ] Border radius maintains pill shape
- [ ] Enter vs Shift+Enter behavior unchanged
- [ ] Voice mode disabling keeps textarea non-interactive without console errors
- [ ] Screen reader announcement still identifies element as editable text field

---

### Task 2: Message Card Figma Spec Styling (PR-6)

#### 2.1 Apply Figma Design Specs
**File:** `src/components/chat/MessageCard.tsx`

**Current State:**
- User: `bg-white/20 border-white/30`
- Assistant: `bg-white/10 border-white/20`
- Simple border radius
- Responsive max-width classes

**Action:**
- [ ] Catalogue existing `Card` class names (backdrop blur, drop shadow, `hover:shadow` variants) and decide which utility classes must remain in `className` to preserve transitions; only move the values explicitly dictated by Figma into the `style` prop.
- [ ] Replace tailwind background/border utilities with inline `style` configs that match the Figma tokens below; keep the responsive width logic handled by `cardWidthClass` unchanged.
- [ ] Normalize padding by applying `style` overrides on `CardContent`; confirm compact vs default spacing remains distinct (plan to pass conditional padding via inline style or className variants).
- [ ] Maintain structural elements: headers (`You`/`Assistant` labels, icons), `ToolCallMessageRenderer`, and the wrapper `div` with `justify-*` classes; document any modifications before coding to prevent accidental regressions.
- [ ] Add explicit handling for tool/system messages so they can continue to opt into full-width layout and default styling if required (e.g., fall back to original gradient when `isToolMessage`).
- [ ] Apply exact Figma values:

**User Message Style:**
```tsx
style={{
  maxWidth: "400px",
  borderRadius: "32px 32px 0 32px",
  border: "1px solid #262531",
  background: "rgba(163, 161, 161, 0.15)",
  boxShadow: "inset 2px 2px 16px rgba(163,161,161,0.15), 2px 3px 32px rgba(202,64,219,0.15)",
  paddingTop: "12px",
  paddingBottom: "8px",
  paddingLeft: "8px",
  paddingRight: "12px",
}}
```

**Assistant Message Style:**
```tsx
style={{
  maxWidth: "400px",
  borderRadius: "32px 32px 32px 0",
  border: "1px solid #262531",
  background: "rgba(163, 161, 161, 0.15)",
  boxShadow: "inset 2px 2px 16px rgba(163,161,161,0.15), 2px 3px 32px rgba(202,64,219,0.15)",
  paddingTop: "12px",
  paddingBottom: "8px",
  paddingRight: "12px",
}}
```

- [ ] Update CardContent padding to match (reduce default padding, use style padding)
- [ ] Keep existing header structure (no logos/icons)
- [ ] Keep existing source indicators (AudioLines/MessageSquare)
- [ ] Maintain `letterSpacing: "-0.32px"` on content div
- [ ] Preserve responsive behavior and tool message handling
- [ ] Update Storybook/docs references (if any) noting the new inline styles for easier diff review

**Verification:**
- [ ] User messages have correct styling (border radius, background, shadow)
- [ ] Assistant messages have correct styling
- [ ] Max width (400px) constraint applies
- [ ] Padding matches spec
- [ ] Existing header structure preserved
- [ ] Tool call messages still render correctly
- [ ] Compact mode still works
- [ ] No layout shifts
- [ ] Hover/focus states of the `Card` remain smooth (no flashing as inline styles override transitions)
- [ ] System/tool messages that bypass Figma styling still display with safe defaults
- [ ] No console warnings about style/className conflicts in React strict mode

---

### Task 3: Card Restyling (PR-11)

#### 3.1 Update All Card Components
**Files:** (10 card components)
1. `src/components/charts/BalanceCard.tsx`
2. `src/components/charts/BalanceDisplay.tsx`
3. `src/components/charts/CreditScoreCard.tsx`
4. `src/components/charts/EMICard.tsx`
5. `src/components/charts/LendingOptionsCard.tsx`
6. `src/components/charts/LoansCard.tsx`
7. `src/components/charts/SavingsCarousel.tsx`
8. `src/components/charts/SavingsGoalCard.tsx`
9. `src/components/charts/SavingsInsightsCard.tsx`
10. `src/components/charts/SavingsTipsCard.tsx`

**Current State:**
- Cards use: `bg-gradient-to-r from-violet-600/90 to-purple-700/90`
- Or: `bg-gradient-to-br from-violet-600/95 to-purple-700/95`
- Border: `border-violet-500/20`
- Text colors: `text-violet-100/70`, `text-violet-100/60`, `text-violet-100/50`
- Various border radius values

**Action for Each Card:**

**Preparation**
- [ ] Catalogue existing Tailwind classes, inline styles, and motion props for both default and `compact` variants; note any shared helper constants so updates remain consistent.
- [ ] Identify sub-elements whose colors inherit from parent classes (chart labels, badges, icon wrappers) to avoid unintentional low-contrast states after palette changes.

**Step 1: Update Card Container**
- [ ] Replace gradient backgrounds with `bg-black/90`; review overlay layers (`absolute inset-0` shimmers, gradients) and tone them down or remove if they conflict with the flat background.
- [ ] Apply `border border-[rgba(34,74,215,0.6)]` (and `hover:border-*` if applicable) while preserving existing drop shadows for depth.
- [ ] Set outer border radius to `rounded-[40px]` across variants; adjust nested elements (icon chips, carousels) to maintain coherent curvature.
- [ ] Retain `backdrop-blur-xl`/`-2xl` and verify stacking context so animated overlays still render above the background.
- [ ] Reassess interactive states (hover scale, focus outlines) to ensure they still read well against the darker backdrop.

**Step 2: Update Text Colors**
- [ ] Replace `text-violet-100/70`, `/60`, `/50` with `text-gray-400`, leaving primary metrics as `text-white` for emphasis.
- [ ] Update supporting copy within charts (`CardDescription`, `Label`, `legend`) to ensure readability; adjust custom hex colors if contrast drops below AA.
- [ ] Preserve semantic colors (green/red indicators, gradient fills) by explicitly documenting them before the refactor.

**Step 3: Special Cases & Component Notes**
- [ ] **CreditScoreCard**: Keep the gradient arc and score thresholds; only swap container/background styles.
- [ ] **SavingsCarousel**: Apply the new styling to each carousel slide, maintain snap/scroll behavior, and confirm arrows/dots remain visible.
- [ ] **EMICard / LoansCard**: Update repayment schedule badges and progress bars to align with the new palette.
- [ ] **SavingsInsightsCard / SavingsTipsCard**: Review list bullet icons and accent stripes for contrast after palette change.
- [ ] **BalanceDisplay & BalanceCard**: Ensure both components mirror the same theme tokens to avoid discrepancies when rendered together.
- [ ] **Compact variants**: Update to the same palette and verify spacing; avoid shrinking border radius below 32px even in compact mode.

**Verification Checklist (for each card):**
- [ ] Card renders with black background
- [ ] Blue border is visible and consistent
- [ ] Border radius is 40px
- [ ] Text is readable (gray-400 on black)
- [ ] Special elements (badges, icons) still visible
- [ ] Animations still work
- [ ] Mobile responsiveness maintained
- [ ] No visual regressions
- [ ] Hover and focus states behave identically to baseline (no jitter or missing outlines)
- [ ] Charts/carousels retain smooth animation curves and do not log React/Recharts warnings
- [ ] Before/after screenshots align with design references for both default and compact layouts

---

## Implementation Order

1. **Task 1: Chat Input Improvements** (1–2 hours)
   - Sequence: (a) adjust background tokens, (b) refactor to textarea + auto-expansion, (c) run focused manual tests (keyboard, voice) before moving on.
   - After coding: run `npm run lint -- NormalMode.tsx` (or scoped lint) and capture updated screenshots for desktop + mobile comparison.
   - Commit as `feat(chat-input): darken background and add auto-expand` with notes about accessibility validation.

2. **Task 2: Message Card Styling** (1–2 hours)
   - Confirm branch rebase if Task 1 introduced conflicts.
   - Implement inline style mapping, verify tool/system messages and compact mode in Storybook or local playground.
   - Execute a targeted regression pass in the voice chat page to ensure message streaming still renders while updates occur.
   - Commit as `feat(chat-ui): apply figma message card styling` once screenshots and lint pass.

3. **Task 3: Card Restyling** (3–4 hours)
   - Update cards in small batches (e.g., financial overview, savings set, lending set) to keep diffs reviewable; run the app after each batch.
   - Perform mobile and desktop smoke tests for each batch, paying attention to animations and scroll containers.
   - Final commit `feat(cards): unify palette across financial widgets` after verifying all checklists and tests.

4. **Stabilization**
   - Run `npm run lint` and `npm run build` on the branch; fix any newly surfaced issues before requesting review.
   - Assemble before/after screenshot bundle and document regression tests executed to support review.

**Total Estimated Time:** 5–8 hours (excludes final QA/documentation buffer)

---

## Regression Watch List

- **Voice mode safeguards:** Ensure textarea refactor does not re-enable typing while recording or during call disconnect states (`isRecording`, `isCallActive`).
- **Keyboard shortcuts:** Verify Enter submission and Shift+Enter multiline remain intact across desktop browsers and on iOS/Android soft keyboards.
- **Quick Actions & contextual injections:** Confirm externally inserted text (drawer suggestions, template buttons) still populate the input and trigger auto-resize.
- **Tool/system message rendering:** Maintain legacy styling fallback so tool results with tables or structured content keep their layout within new card styles.
- **Chart data hooks:** Cards using `onUserAction` or `useEffect` side effects (e.g., balance alerts) must continue firing without duplication despite styling changes.
- **Animations & performance:** Monitor Framer Motion mounts and Recharts updates for dropped frames caused by more expensive box shadows or backdrops.
- **Accessibility:** Re-run contrast checks (e.g., using Axe, Lighthouse) and ensure focus indicators remain visible after palette update.

---

## Testing Strategy

### Visual Testing
- [ ] Perform before/after screenshot diffing for: chat input (focus/recording states), message cards (user, assistant, tool), and each financial card (compact + default); store in `/docs/active/ui-regressions/`.
- [ ] Validate layouts on mobile (375px), tablet (768px), desktop (1440px) using responsive dev tools; confirm auto-expanding textarea doesn’t trigger overflow.
- [ ] Verify dark mode and light mode equivalents (if theming toggles exist) to ensure new styles remain legible.
- [ ] Observe animations (Framer Motion, carousel transitions) for stutter or clipping introduced by background changes.

### Functional Testing
- [ ] Chat input: Type long messages (>=5 lines), verify expansion/scroll, ensure Enter vs Shift+Enter works, test IME composition.
- [ ] Voice mode: Start/stop recording, ensure textarea disables/enables properly and no console warnings appear.
- [ ] Quick Actions: Open drawer and insert a suggestion to confirm textarea still accepts external text updates and auto-resizes accordingly.
- [ ] Message cards: Render user, assistant, tool/system messages; verify streaming updates append without layout jump.
- [ ] Message cards: Toggle compact mode (if accessible via settings) and confirm inline styles respect the variant.
- [ ] Financial cards: Mount each component (including carousel) and interact with any buttons or hover states.
- [ ] Savings carousel: swipe on touch device/emulator to ensure blue border doesn’t interfere with drag physics.

### Regression Testing
- [ ] Monitor browser console and terminal for warnings after hot reload (especially hydration mismatch or inline style warnings).
- [ ] Verify no layout shifts occur when new messages stream in or when cards animate on mount by using Chrome Performance panel.
- [ ] Confirm Convex data interactions triggered by cards (`onUserAction`) still fire and log expected payloads.
- [ ] Run `npm run lint` and `npm run build` to detect any TypeScript or style-related regressions prior to PR.
- [ ] Ensure responsive behavior across breakpoints remains consistent with baseline screenshots.

---

## Success Criteria

### Chat Input
- ✅ Background is darker/more visible
- ✅ Textarea expands up to 200px max height
- ✅ Scrollbar appears when needed
- ✅ Height resets on clear
- ✅ Enter vs Shift+Enter behavior unchanged across browsers/devices
- ✅ Voice mode disabling and Quick Actions injections remain functional

### Message Cards
- ✅ Match Figma spec exactly (background, border, radius, shadow)
- ✅ Max width constraint (400px) applies
- ✅ Existing functionality preserved
- ✅ No visual regressions
- ✅ Tool/system messages retain appropriate fallback styling and layout

### Cards
- ✅ All 10 cards use unified styling
- ✅ Text is readable (gray-400 on black)
- ✅ Consistent visual language
- ✅ No broken layouts
- ✅ Animations, charts, and carousel interactions remain smooth

---

## Risk Mitigation

### Pre-Implementation
- [ ] Create feature branch `feat/ui-improvements-volodymyr` off a clean, updated `main`.
- [ ] Run `npm run lint` + `npm run build` to ensure baseline is green before touching UI code.
- [ ] Record walkthrough videos or screenshots of current chat + card UI (desktop/mobile) for visual comparison.
- [ ] List all touchpoints where `NormalMode`, `MessageCard`, and chart cards are imported to anticipate integration-testing surfaces.

### During Implementation
- [ ] Work in small commits, each scoped to a single component group (chat input, message cards, each card batch) to simplify reverts.
- [ ] After each subtask, run targeted smoke tests (`npm run dev` + manual) and capture updated screenshots.
- [ ] Avoid leaving commented-out legacy styles; rely on Git history for rollback to keep diffs clean.
- [ ] Keep an eye on TypeScript errors or ESLint warnings introduced by refactors and address them immediately.

### Post-Implementation
- [ ] Execute the expanded testing strategy (visual, functional, regression) and log outcomes in the PR description.
- [ ] Test in Chrome, Safari, and Firefox (latest stable) with desktop + responsive modes; confirm no browser-specific glitches (e.g., textarea auto-grow differences).
- [ ] Review Lighthouse accessibility contrast scores for chat input and cards to validate improvements.

### Rollback Plan
- [ ] Because commits are isolated, revert the offending commit via `git revert <sha>` if an issue surfaces.
- [ ] Maintain a changelog of design decisions and any deviations from original PRs to aid future audits.
- [ ] If a regression is detected post-merge, restore previous screenshots + metrics to guide quick fix forward rather than blanket revert.

---

## Files to Modify

### Chat Input
- `src/components/unified/NormalMode.tsx`

### Message Cards
- `src/components/chat/MessageCard.tsx`

### Cards (10 files)
- `src/components/charts/BalanceCard.tsx`
- `src/components/charts/BalanceDisplay.tsx`
- `src/components/charts/CreditScoreCard.tsx`
- `src/components/charts/EMICard.tsx`
- `src/components/charts/LendingOptionsCard.tsx`
- `src/components/charts/LoansCard.tsx`
- `src/components/charts/SavingsCarousel.tsx`
- `src/components/charts/SavingsGoalCard.tsx`
- `src/components/charts/SavingsInsightsCard.tsx`
- `src/components/charts/SavingsTipsCard.tsx`

**Total:** 12 files

---

## Notes

1. **Logo/Icons Excluded**: User confirmed they have existing logo and don't want logo/icon changes in message cards
2. **Styling Only**: PR-6 changes focus on styling (background, border, shadow) - no new UI elements
3. **Consistent Pattern**: PR-11 card restyling follows same pattern across all cards - good for batch update
4. **Auto-scroll**: Already implemented in `app/voice-chat/page.tsx` - no changes needed
5. **Voice Mode Disable**: Not implementing text input disable in voice mode (not in scope)

---

## Next Steps

1. ✅ Plan complete
2. ⏳ **Await approval** to start implementation
3. ⏳ Create feature branch
4. ⏳ Begin with Task 1 (Chat Input)

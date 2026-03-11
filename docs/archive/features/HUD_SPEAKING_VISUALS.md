## HUD Speaking Visuals — Architecture, Current Issues, and Next Steps

---

## Session Summary – Waveforms Placement & Visibility (2025-09-11)

### What the feature is supposed to do
- Render two waveform “chips” (Agent left, User right) either:
  - Over the chat input (anchored to the input’s edges), or
  - In a fixed corner (bottom-left/right), or
  - Off.
- Show the chips only while a voice call is active, or always, based on a visibility setting.

### Current architecture (key files)
- `src/components/voice/SpeakingHUD.tsx`
  - Fixed overlay (`position: fixed`, `z-20`) with `pointer-events: none`.
  - For placement `'over-input'` it measures an anchor element using `getBoundingClientRect()` and positions the chips above the input via absolute `left`/`top` within the fixed overlay.
  - Uses a `ResizeObserver` plus `scroll`/`resize` listeners; throttled with `requestAnimationFrame`.
  - Anchor lookup order (new):
    1) `[data-waveform-anchor]` (precise marker on the input container)
    2) `#unified-chat-input-root` (outer wrapper)
  - If no anchor resolves, it falls back to `bottom-left` with fixed 16px offsets.
- `src/components/unified/UnifiedChatInput.tsx`
  - Desktop: fixed wrapper with id `unified-chat-input-root` (`z-50`).
  - Mobile: rendered inside a `footer` wrapper (still contains the same id).
- `src/components/unified/NormalMode.tsx`
  - The main input container now includes `data-waveform-anchor` to provide a precise target for the HUD.
- `app/voice-chat/page.tsx`
  - Backgrounds render at `z-0`. HUD renders as a sibling above backgrounds. Main content is `z-10`. Input wrapper is `z-50`.

### Settings model (what we added/changed)
- `visuals.waveformPlacement`: `'over-input' | 'bottom-left' | 'bottom-right' | 'off'` (default `'over-input'`).
- NEW `visuals.waveformsVisibility`: `'active' | 'always'` (default `'active'`).
  - `'active'`: HUD renders only when `voiceStatus !== 'idle'`.
  - `'always'`: HUD renders regardless of call state (useful for alignment/debugging).
- Settings UI: Added “Waveforms Visibility” toggle to `ConversationVisualsPanel`.

### What we changed this session
- Moved HUD render out of the background block to ensure proper stacking above content.
- Implemented `waveformsVisibility` setting and UI.
- Switched HUD anchor detection to prefer `[data-waveform-anchor]` before `#unified-chat-input-root`.
- Adjusted over-input positioning to use viewport `top` offsets (via `rect.top`) and variant-based vertical spacing (32px compact, 56px default).
- Corner fallbacks now use fixed pixel offsets to avoid env() inconsistencies.

### Current issues observed
- The chips consistently render in the bottom-left corner even when settings are `'over-input'`:
  - This indicates the fallback path is active because the anchor is not resolving (anchor is `null`).
  - Despite the retry loop (interval + `ResizeObserver`), the HUD is not attaching to either `[data-waveform-anchor]` or `#unified-chat-input-root`.
- Chips sometimes remained visible after ending a call:
  - Addressed by honoring `waveformsVisibility` and requiring `voiceStatus !== 'idle'` when visibility is `'active'`.
  - If visibility is set to `'always'`, they will remain visible by design.

### Likely root causes (to verify next)
1) Anchor availability/timing
   - The input container may not exist yet when HUD initializes, or mounts later than our check. We do retry, but need to confirm with logs.
2) Anchor selector mismatch
   - Ensure the exact input container carries `data-waveform-anchor` on the page being tested (desktop vs. mobile). Confirm there is only one.
3) Conditional rendering path
   - If `mode === 'go'` or a different input variant renders without the anchor attribute, the lookup will fail.
4) DOM isolation/portals
   - If the input is rendered within a portal or different root (unlikely for current code), `document.querySelector` may not find it.

### Diagnostics to run in the next session
- Add minimal console logs in `SpeakingHUD` for:
  - First successful selection of `[data-waveform-anchor]` or `#unified-chat-input-root` (log which, and element bounds).
  - Anchor loss/recompute events from `ResizeObserver`.
- Confirm the presence of a single `[data-waveform-anchor]` in the DOM at runtime using DevTools.
- Verify `voiceStatus` transitions to `'idle'` on disconnect; otherwise the HUD may persist when visibility is `'active'`.

### Next implementation steps (proposed)
- Replace interval retry with a `MutationObserver` that watches for either anchor element to be added to the DOM.
- As a last-resort stabilization, allow passing an explicit anchor element ref/id down to HUD from `UnifiedChatInput` to avoid global DOM queries.
- Add a small “debug overlay” option that shows the anchor rect and computed chip positions when visibility is `'always'`.

### Quick reference (layering & ids)
- HUD overlay: fixed, `z-20`.
- Main content: `z-10`.
- Input wrapper (`#unified-chat-input-root`): fixed, `z-50`.
- Precise input container: `[data-waveform-anchor]` (inside NormalMode input container).

### TL;DR
- Goal: One clear, always-visible speaking indicator that can sit over the input (original look) or in corners, with simple toggles.
- Current source of truth: HUD waveforms (overlay) anchored to the input; input-embedded waveforms can be disabled via settings.
- Two main problems observed:
  - Duplicate waveforms: input and HUD both rendering due to settings merge/guard behavior (now corrected to deep-merge settings and use strict boolean checks).
  - Hydration error: HUD rendered in SSR path caused a React hydration mismatch (now gated behind `mounted` and dynamically imported).

---

### Components and Data Flow

- `src/components/unified/hooks/useVoiceRecording.ts`
  - Produces `voiceStatus` (`idle|connecting|listening|speaking`) and audio levels (`user`, `agent`).
  - Emits `onStatusChange` and `onTranscript` into `UnifiedChatInput` / page.

- `src/components/unified/UnifiedChatInput.tsx`
  - Top-level container now has id `unified-chat-input-root` (used by HUD for anchoring).
  - Emits `onVoiceAudioUpdate(isUserSpeaking, userLevel, agentLevel)` upward to `page.tsx`.

- `src/components/unified/NormalMode.tsx`
  - Renders input-anchored waveforms (left/agent, right/user) above the input.
  - Guard: `Boolean(settings.visuals?.showWaveformsInInput)`; defaults to off via settings defaults.

- `components/ui/voice-reactive-background.tsx`
  - Side gradients (left/right) and center bar, controlled by props:
    - `showLeftGradient`, `showRightGradient`, `showCenterGradient`, `gradientVariant`.

- `src/components/voice/SpeakingHUD.tsx`
  - Client-only fixed overlay (`position: fixed`, `z-20`, `pointer-events: none`).
  - Anchors to `#unified-chat-input-root` using `ResizeObserver` and `getBoundingClientRect()` to position two `WaveformIndicator` chips just above the input’s left/right edges.
  - Optional header strip (top LED-like bar) based on `settings.visuals.showHeaderStrip`.

- `app/voice-chat/page.tsx`
  - Dynamically imports background and HUD (`ssr: false`).
  - Renders HUD only when `mounted === true` to avoid hydration mismatch.
  - Passes `voiceStatus`, speaking flags, and levels to background/HUD.

---

### Settings Model (Persisted in localStorage)

`src/components/unified/hooks/useSettings.ts`

```ts
export interface Settings {
  voice: string;
  language: string;
  speed: number;
  speedPreset: number;
  captions: boolean;
  goMode: boolean;
  visuals?: {
    showWaveformsHUD: boolean;        // HUD waveforms (overlay)
    showWaveformsInInput: boolean;    // Input-anchored waveforms
    showSideGradients: boolean;       // Left/right background glows
    showCenterGradient: boolean;      // Center link bar
    showHeaderStrip: boolean;         // Top bar
    gradientVariant: 'default'|'alt';
    waveformVariant: 'default'|'compact';
  };
}
```

Defaults:

```ts
visuals: {
  showWaveformsHUD: true,
  showWaveformsInInput: false, // One waveform by default (HUD)
  showSideGradients: true,
  showCenterGradient: false,
  showHeaderStrip: false,
  gradientVariant: 'default',
  waveformVariant: 'default'
}
```

Loading & updating:
- Deep-merge stored settings with defaults to ensure missing `visuals` fields adopt our defaults (prevents implicit truthy fallbacks).
- `updateSettings` deep-merges `visuals` keys to avoid wiping nested settings.

Settings UI (`src/components/unified/SettingsPanel.tsx`):
- Adds toggles for HUD/Input waveforms, gradients, center bar, header strip, and simple variant selectors.

---

### What We Changed Recently

1) Prevent double waveforms
- NormalMode condition now requires `Boolean(settings.visuals?.showWaveformsInInput)` instead of using a `?? true` fallback.
- Settings loader deep-merges defaults so `showWaveformsInInput` reliably defaults to `false`.

2) Fix hydration mismatch
- SpeakingHUD is dynamically imported with `ssr: false` and rendered only after `mounted === true` in `page.tsx`.

3) Anchor HUD to input reliably
- HUD uses `ResizeObserver` on `#unified-chat-input-root` and recomputes position on resize/scroll,
  placing the left/right chips just above the input’s left/right edges.

---

### Known Issues & Nuances

1) Duplicate waveforms
- Root cause (before fixes): stored settings missing `visuals` would cause the input guard to default to true, showing both input and HUD.
- With deep-merge + strict guard this should be resolved, but if a user had toggled Input Waveforms on in an earlier session, localStorage can re-enable it. Action: open Settings → turn off Input Waveforms, or clear `localStorage['finpilot-voice-settings']`.

2) Hydration error: "Expected static flag was missing"
- Root cause: a client-only HUD rendered during SSR led to markup mismatch during hydration.
- Gating HUD behind `mounted` + dynamic import prevents SSR render; if error persists, confirm that no intermediate child in HUD conditionally renders different trees between pre/post mount.

3) Placement edge cases
- On small screens, virtual keyboard & safe-area insets can change input position rapidly. HUD listens to `resize`/`scroll` but may still require platform-specific tuning for offset and safe-area padding.
- If input width gets very small, the right chip fallback (`max(anchor.right - 16 - 80, anchor.left + 96)`) avoids overlap but may need refinement if the input style changes.

4) Z-index layering
- HUD is `z-20` and should sit above messages but under modals. If any overlay obscures it, adjust z-index locally or give HUD a separate stacking context.

5) Performance
- `ResizeObserver` is light but runs often on input resizing; the update callback can be throttled if needed.

---

### Repro / Verification Checklist

1) Confirm only one waveform layer is on
- Settings: HUD Waveforms = ON, Input Waveforms = OFF.
- If both appear, clear localStorage key `finpilot-voice-settings` and reload, then re-check Settings.

2) Check HUD anchor
- Inspect `#unified-chat-input-root` exists.
- Log HUD anchor values (left, right, bottom) and verify the chips sit slightly above input edges.

3) Hydration
- Ensure HUD only renders when `mounted` is true.
- Verify HUD is dynamically imported (`ssr: false`).

4) Background visuals
- Toggle side gradients/center bar independently and verify visibility/intensity changes.

---

### Proposed Next Steps (Lean)

1) Single placement switch (optional improvement)
- Replace the two booleans (HUD/Input) with `visuals.waveformPlacement: 'over-input' | 'bottom-left' | 'bottom-right' | 'off'`.
- Keep a single renderer (HUD). For 'over-input' use the measured anchor; for corners use fixed positions with safe-area padding. This guarantees exactly one waveform source.

2) Platform polish
- Add safe-area-aware offsets for iOS.
- Add small throttle to HUD anchor updates (e.g., `requestAnimationFrame`).

3) Testing
- Storybook/Playwright scenarios for: desktop, mobile portrait, mobile with keyboard open; verify no overlap and no hydration issues.

---

### File Map & Key Lines

- `app/voice-chat/page.tsx`
  - Dynamic imports for HUD/background; HUD rendered when `mounted`.

- `src/components/voice/SpeakingHUD.tsx`
  - Fixed overlay; anchors to `#unified-chat-input-root` via `ResizeObserver`.

- `src/components/unified/NormalMode.tsx`
  - Input-anchored waveforms; guarded by `Boolean(settings.visuals?.showWaveformsInInput)`.

- `src/components/unified/hooks/useSettings.ts`
  - Deep-merge defaults with stored settings; deep-merge visuals in updates.

- `components/ui/voice-reactive-background.tsx`
  - Gradient toggles and variant.

---

### Open Questions
- Do we want a single placement enum now to prevent any possibility of double-render paths?
- Should the HUD chips be slightly closer/farther from the input on mobile vs desktop?
- Do we want an optional portal-based approach for the HUD (e.g., to render under modals)?

---

### Appendix: Quick Recovery Steps if Issues Recur

1) Clear stored settings to remove legacy toggles
```
localStorage.removeItem('finpilot-voice-settings');
location.reload();
```

2) Verify only one waveform source is enabled in Settings.

3) Ensure HUD appears after hydration (no SSR render): `mounted` must be true.




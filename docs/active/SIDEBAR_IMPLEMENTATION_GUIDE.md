# Desktop Settings Sidebar - Implementation Guide

## Key Architectural Patterns to Leverage

### 1. **Existing Component Reusability**

#### SettingsPanel Content (Already Built):
- ✅ Voice selection carousel (lines 182-210)
- ✅ Language dropdown (lines 234-302)
- ✅ Speech speed presets (lines 304-333)
- ✅ Live captions toggle (lines 335-367)
- ✅ On-the-Go Mode toggle (lines 369-401)
- ✅ Conversation Visuals button (lines 212-232)
- ✅ Quick Actions section (lines 403-420)

**Refactoring Strategy:**
1. Extract content into reusable sub-components (e.g., `VoiceSelection`, `LanguageSelector`, `SpeedControl`)
2. Create desktop `SettingsSidebar` that uses same sub-components
3. Keep `SettingsPanel` for mobile (existing modal)
4. Both consume same `useSettings` hook and callbacks

---

### 2. **Responsive Architecture Pattern**

The codebase uses **explicit prop-based branching** rather than CSS breakpoints for major layout changes:

```typescript
// CURRENT PATTERN (Used Throughout)
// Instead of: className={`hidden md:flex`}
// They do: {!isMobile && <Component />}

// Examples:
// app/voice-chat/page.tsx:252
className={`relative z-10 h-full ${isMobile ? 'grid grid-rows-[auto,1fr,auto]' : 'flex flex-col'}`}

// app/voice-chat/VoiceChatContent.tsx:267
className={`${isMobile ? 'min-h-0 overflow-hidden' : 'flex-1'} flex flex-col`}

// src/components/unified/UnifiedChatInput.tsx:289
className={cn(
  isMobile ? "relative w-full" : "fixed bottom-2 left-0 right-0 z-50",
)}
```

**This means for sidebar:**
- Desktop conditional rendering: `{isDesktop && <SettingsSidebar />}`
- Mobile conditional rendering: `{isMobile && <SettingsPanel />}`
- Use `useIsMobile()` hook from `hooks/use-mobile.ts`

---

## Component Extraction Plan

### Step 1: Create Sidebar-Ready Sub-Components

Create small, reusable components for each settings section:

```
src/components/unified/settings-sections/
├── VoiceSelector.tsx       (Extract lines 182-210 from SettingsPanel)
├── LanguageSelector.tsx    (Extract lines 234-302)
├── SpeedControl.tsx        (Extract lines 304-333)
├── CaptionsToggle.tsx      (Extract lines 335-367)
├── GoModeToggle.tsx        (Extract lines 369-401)
├── VisualsButton.tsx       (Extract lines 212-232)
└── QuickActions.tsx        (Extract lines 403-420)
```

Each component should:
- Accept `settings` and `onUpdateSettings`
- Be fully self-contained
- Have no modal-specific styling
- Work in both modal and sidebar context

---

### Step 2: Create SettingsSidebar Component

**File:** `src/components/unified/SettingsSidebar.tsx`

Structure:
```typescript
export function SettingsSidebar({
  settings,
  onUpdateSettings,
  onShowVisualsPanel,
}: SettingsSidebarProps) {
  return (
    <aside className={cn(
      "hidden lg:flex flex-col",  // Or use isDesktop from props
      "w-[360px]",
      "bg-black/90 backdrop-blur-2xl",
      "border-l border-white/20",
      "overflow-y-auto scrollbar-drawer"
    )}>
      {/* Header */}
      <div className="sticky top-0 px-6 py-5 border-b border-white/10 bg-black/50">
        <h2 className="text-xl font-semibold text-white">Voice Settings</h2>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        <VoiceSelector settings={settings} onUpdateSettings={onUpdateSettings} />
        <LanguageSelector settings={settings} onUpdateSettings={onUpdateSettings} />
        <SpeedControl settings={settings} onUpdateSettings={onUpdateSettings} />
        <CaptionsToggle settings={settings} onUpdateSettings={onUpdateSettings} />
        <GoModeToggle settings={settings} onUpdateSettings={onUpdateSettings} />
        <VisualsButton onShowVisualsPanel={onShowVisualsPanel} />
        <QuickActions />
      </div>
    </aside>
  );
}
```

---

### Step 3: Update Layout in `app/voice-chat/page.tsx`

**Current structure:**
```tsx
<div className="relative z-10 h-full flex flex-col">
  <VoiceChatHeader />
  <main className="flex-1 flex flex-col">
    {/* Messages */}
  </main>
</div>
```

**New structure (desktop ≥ 768px):**
```tsx
<div className="relative z-10 h-full flex flex-col">
  <VoiceChatHeader />
  <div className="flex flex-1 overflow-hidden">
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Messages - max-width adjusts when sidebar visible */}
    </main>
    {/* Settings Sidebar - desktop only */}
    {!isMobile && showSettingsSidebar && (
      <SettingsSidebar
        settings={settings}
        onUpdateSettings={updateSettings}
        onShowVisualsPanel={() => setShowVisualsPanel(true)}
      />
    )}
  </div>
</div>
```

---

## Integration Points

### 1. **Header Kebab Menu Integration**

**File:** `src/components/VoiceChatHeader.tsx` (lines 94-102)

Current Settings button in menu:
```tsx
<button
  onClick={() => {
    onSettingsOpen();  // Just opens modal
    setKebabOpen(false);
  }}
  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded text-sm"
>
  <Settings className="h-4 w-4" /> Settings
</button>
```

**Modified for responsive:**
```tsx
<button
  onClick={() => {
    if (isDesktop) {
      // Desktop: Open sidebar
      setShowSettingsSidebar(prev => !prev);  // Toggle
    } else {
      // Mobile: Open modal
      onSettingsOpen();
    }
    setKebabOpen(false);
  }}
  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded text-sm"
>
  <Settings className="h-4 w-4" /> Settings
</button>
```

**Need to pass down:** `isDesktop` and `setShowSettingsSidebar` to header

---

### 2. **Conversation Visuals Click**

**File:** `src/components/unified/SettingsSidebar.tsx` (new VisualsButton)

```tsx
<motion.button
  whileTap={{ scale: 0.98 }}
  onClick={() => onShowVisualsPanel(true)}
  className={cn(
    "w-full flex items-center justify-between py-4 px-4 rounded-xl",
    "bg-white/5 hover:bg-white/10 transition-all",
    "border border-white/10 hover:border-white/20"
  )}
>
  <div className="flex items-center gap-3">
    <Palette className="w-5 h-5 text-white/70" />
    <div className="text-left">
      <div className="text-white font-medium">Conversation Visuals</div>
      <div className="text-xs text-white/50">Customize waveforms & effects</div>
    </div>
  </div>
  <ChevronDown className="w-4 h-4 text-white/50 -rotate-90" />
</motion.button>
```

---

## Layout Considerations

### Messages Area Adjustment

Currently:
```tsx
<div className="max-w-4xl mx-auto">
  {/* Messages */}
</div>
```

With sidebar visible, should adjust:
```tsx
<div className={cn(
  "mx-auto",
  showSettingsSidebar && !isMobile ? "max-w-3xl" : "max-w-4xl"
)}>
  {/* Messages - still centered but narrower when sidebar visible */}
</div>
```

### Input Positioning

Currently on desktop:
```tsx
className="fixed bottom-2 left-0 right-0 z-50 max-w-[428px] mx-auto"
```

With sidebar, should account for sidebar width:
```tsx
className={cn(
  "z-50",
  isMobile 
    ? "relative w-full"
    : cn(
        "fixed bottom-2 left-0 right-0",
        "max-w-[428px]",
        // When sidebar is visible, offset or adjust centering
        showSettingsSidebar 
          ? "mr-[360px]"  // Account for sidebar width
          : "",
        "mx-auto"
      )
)}
```

---

## Z-Index Hierarchy (Final)

```
0    | Background particle animation
10   | Main content container
30   | Settings Sidebar (below header)
40   | Background gradients overlay
50   | Header (sticky top)
50   | Unified Chat Input (fixed bottom)
60   | SettingsPanel modal (overlays everything)
70   | ConversationVisualsPanel (overlays settings modal)
```

---

## Testing Checklist

### Desktop (≥ 768px):
- [ ] Settings sidebar renders on right side
- [ ] Sidebar width is 360px
- [ ] Messages max-width adjusts to max-w-3xl when sidebar visible
- [ ] Kebab menu "Settings" button toggles sidebar visibility
- [ ] Conversation Visuals button in sidebar opens overlay
- [ ] All settings (voice, language, speed, captions, go-mode) update correctly
- [ ] Sidebar scrolls independently from messages
- [ ] Z-index layering correct (modals appear above sidebar)

### Mobile (< 768px):
- [ ] Settings sidebar NOT rendered
- [ ] Settings modal (SettingsPanel) shows on demand
- [ ] No layout changes or regressions
- [ ] Messages still use max-w-4xl
- [ ] Input positioning unchanged

### Responsive Transitions:
- [ ] Smooth behavior when resizing viewport
- [ ] Sidebar appears/disappears at 768px breakpoint
- [ ] No console errors during transition

### Performance:
- [ ] Sidebar toggle doesn't cause layout thrashing
- [ ] Render time < 50ms for toggle
- [ ] No memory leaks (check when opening/closing repeatedly)

---

## Estimated Time per Phase

| Phase | Tasks | Est. Hours | Notes |
|-------|-------|-----------|-------|
| Setup | Extract sub-components | 3-4h | Mechanical refactoring |
| Core | Create SettingsSidebar, update layout | 4-5h | New component + layout changes |
| Integration | Wire triggers, state management | 2-3h | Connect all pieces |
| Polish | Animations, styling, tweaks | 2-3h | Fine-tuning |
| Testing | Desktop/mobile/responsive tests | 2-3h | Comprehensive QA |
| **TOTAL** | — | **13-18h** | ~2 days solid work |

---

## Migration Path (Lowest Risk)

**Approach: Gradual, feature-flagged**

1. **Day 1:** Create all sub-components (with no breaking changes)
2. **Day 1.5:** Create SettingsSidebar component (rendered but hidden)
3. **Day 2:** Update layout structure
4. **Day 2.5:** Wire triggers and test extensively
5. **Day 3:** Polish and final QA

**Rollback plan:** Each phase can be reverted independently since:
- Sub-components are additive
- SettingsSidebar is conditional render
- Layout changes are in a single place
- Triggers use prop drilling

---

## Key Differences: Modal vs. Sidebar

| Aspect | Modal (Current) | Sidebar (Proposed) |
|--------|-----------------|-------------------|
| **Trigger** | Click Settings → Opens over content | Click Settings → Shows on right |
| **Scroll** | Self-scrolling, modal scroll | Independent from messages scroll |
| **Position** | `fixed inset-x-0 bottom-0 top-20%` | `fixed right-0 top-56px bottom-0` |
| **Width** | `max-w-[428px]` centered | `w-[360px]` docked right |
| **Backdrop** | Dark overlay (modal background) | No backdrop (docked) |
| **Z-index** | 60 (overlays input) | 30 (below header) |
| **Dismissal** | Click outside or X button | Click X or toggle via menu |
| **Mobile** | Modal still used | Modal for all mobile |


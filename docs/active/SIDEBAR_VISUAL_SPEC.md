# Desktop Settings Sidebar - Visual & UX Specification

## Overview

A fixed right-side panel that displays settings controls alongside the voice chat conversation. Desktop-only feature that replaces the modal experience with a persistent, integrated sidebar.

---

## Visual Layout Specification

### Desktop Layout (≥ 768px)

```
┌─────────────────────────────────────┬──────────────────┐
│  Header (logo | title | kebab menu) │                  │
├─────────────────────────────────────┼──────────────────┤
│                                     │  ┌─ Sidebar ───┐ │
│  ┌─────────────────────────────┐   │  │              │ │
│  │  Messages Display           │   │  │ Voice        │ │
│  │  (centered, max-w-3xl)      │   │  │ Settings     │ │
│  │                             │   │  │              │ │
│  │  Message item 1             │   │  ├──────────────┤ │
│  │  Message item 2             │   │  │ • Voice      │ │
│  │  Message item 3             │   │  │ • Language   │ │
│  │                             │   │  │ • Speed      │ │
│  │  (scroll independently)     │   │  │ • Captions   │ │
│  │                             │   │  │ • Go Mode    │ │
│  └─────────────────────────────┘   │  │ • Visuals    │ │
│                                     │  │ • Actions    │ │
├─────────────────────────────────────┤  │              │ │
│ Input Area (400px, centered)        │  │(scroll)      │ │
│ [🎤 Voice | Text Input | Send]      │  │              │ │
└─────────────────────────────────────┴──────────────────┘
```

### Sidebar Dimensions

- **Width:** 360px (fixed)
- **Height:** Full viewport height
- **Top:** Below header (56px)
- **Right:** Docked to right edge
- **Position:** fixed (doesn't scroll with messages)

### Desktop Spacing

- **Left content area:** `flex-1` (takes remaining space)
- **Messages max-width:** `max-w-3xl` (narrower when sidebar visible)
- **Gap between messages and sidebar:** 0px (no gap, they're adjacent)
- **Input width:** `max-w-[428px]` (centered below messages)

---

## Component Breakdown

### 1. Sidebar Header (Fixed Top)

```
┌──────────────────────────┐
│ Voice Settings      ✕    │
└──────────────────────────┘
```

- **Height:** 56px (56px = 14px padding-top + text + 14px padding-bottom)
- **Background:** `bg-black/50` (semi-transparent, distinguishes from content)
- **Border:** `border-b border-white/10`
- **Content:** Title + close button (X)
- **Sticky:** Yes (stays at top when scrolling)

### 2. Voice Selection Section

```
┌──────────────────────────┐
│ 🎤 Voice                 │
│                          │
│ [Jessica ▼] [Jess] [Sue] │
│ [Liam  ] [JW  ]          │
│                          │
│ Scrollable horizontally  │
└──────────────────────────┘
```

- **Label:** Icon + text ("Voice")
- **Content:** Horizontal scrolling voice button carousel
- **Button width:** ~70-80px each
- **Active state:** `bg-white/20 border-white/40`
- **Inactive state:** `bg-white/5 border-white/20`

### 3. Language Selector Section

```
┌──────────────────────────┐
│ 🌍 Language              │
│                          │
│ ┌──────────────────────┐ │
│ │ 🇮🇳 Hindi          ▼ │ │
│ └──────────────────────┘ │
│                          │
│ (Dropdown on click)      │
└──────────────────────────┘
```

- **Label:** Icon + text ("Language")
- **Dropdown:** Full-width button with dropdown arrow
- **Active language:** Shows flag + name
- **Dropdown options:** Vertically stacked, highlight on hover

### 4. Speech Speed Control

```
┌──────────────────────────┐
│ ⚡ Speech Speed          │
│                          │
│ [Slow] [Normal]          │
│ [Fast] [Auto-Adapt]      │
│                          │
│ 2x2 grid layout          │
└──────────────────────────┘
```

- **Layout:** 2x2 grid
- **Each button:** Shows preset name + description
- **Active state:** `bg-white/20 border-white/40`
- **Font size:** Text-sm (smaller than voice buttons)

### 5. Toggle Sections

```
┌──────────────────────────┐
│ 📝 Live Captions    ◉ ◯  │
│ Show real-time text  (O) │
├──────────────────────────┤
│ 🚗 On-the-Go Mode   ◉ ◯  │
│ Large buttons driving (O)│
└──────────────────────────┘
```

- **Layout:** Full-width button with icon, description, toggle
- **Toggle:** Framer Motion animated circle (left/right)
- **Active toggle:** `bg-blue-500`
- **Inactive toggle:** `bg-white/20`
- **Description text:** `text-xs text-white/50`

### 6. Conversation Visuals Button

```
┌──────────────────────────┐
│ 🎨 Conversation Visuals  │
│ Customize waveforms... ► │
└──────────────────────────┘
```

- **Layout:** Full-width button with icon, description, chevron
- **Background:** `bg-white/5 hover:bg-white/10`
- **Border:** `border-white/10 hover:border-white/20`
- **Chevron:** Rotated -90° (pointing right)
- **Click:** Opens ConversationVisualsPanel overlay

### 7. Quick Actions Section

```
┌──────────────────────────┐
│ Quick Actions            │
├──────────────────────────┤
│ [Personalise] [Incognito]│
│                          │
│ 2x1 grid (full width)    │
└──────────────────────────┘
```

- **Label:** Small section header
- **Layout:** 2-column grid
- **Button styling:** Same as modal version
- **Background:** `bg-white/10`
- **Hover:** `bg-white/20`

---

## Styling Reference

### Colors (From SettingsPanel)

- **Background:** `bg-black/90`
- **Backdrop:** `backdrop-blur-2xl backdrop-saturate-150`
- **Border:** `border-white/20`
- **Text primary:** `text-white`
- **Text secondary:** `text-white/70`
- **Text tertiary:** `text-white/50`
- **Hover state:** `bg-white/10` or `bg-white/15`
- **Active state:** `bg-white/20`
- **Accent:** `bg-blue-500` (toggles)

### Borders & Dividers

- **Horizontal dividers:** `border-t border-white/10` (between sections)
- **Section borders:** `border border-white/20` or `border-white/10`
- **Rounded corners:** `rounded-xl` (most elements)

### Padding & Spacing

- **Sidebar padding:** `px-6` (horizontal)
- **Section spacing:** `space-y-6` (vertical gap between sections)
- **Button padding:** `py-4 px-4` (toggles) or `px-4 py-3` (regular)
- **Header padding:** `px-6 py-5`

### Scroll Styling

- **Scrollbar class:** `scrollbar-drawer` (custom styling from app globals)
- **Scroll behavior:** Independent from messages area
- **Overflow:** `overflow-y-auto`

---

## Interaction Behaviors

### Opening Sidebar

**Trigger 1: Kebab Menu → Settings**
- User clicks "Settings" option in header kebab menu
- Sidebar toggles visibility (appears from right or hidden)
- Animation: Smooth slide-in from right (optional)
- Sidebar stays visible until user clicks toggle again or X button

**Trigger 2: Direct Sidebar Button** (Future enhancement)
- Add settings icon to header
- Single-click toggle for desktop

### Closing Sidebar

**Method 1: X Button**
- Click X button in sidebar header
- Sidebar slides out, hidden
- Settings persist

**Method 2: Kebab Menu Toggle**
- Click "Settings" again in kebab menu
- Sidebar toggles closed
- Settings persist

**Method 3: Manual outside click** (Optional, not recommended)
- Clicking messages area doesn't close sidebar
- Encourages persistent discovery

### Interaction During Voice Call

- Settings accessible while call is active ✅
- Can change voice, speed, language mid-call
- Visual settings changeable (waveform placement, etc.)
- All changes apply in real-time

---

## Responsive Behavior

### Desktop (≥ 768px)
- ✅ Sidebar visible (when toggled on)
- ✅ Messages adjust to `max-w-3xl`
- ✅ Input stays centered below messages
- ✅ Sidebar scrolls independently

### Tablet (600px - 767px)
- Depends on requirements
- Could continue showing sidebar (if screen wide enough)
- Or switch to modal (for consistency with mobile)
- Current implementation: 768px breakpoint

### Mobile (< 768px)
- ✅ Sidebar NOT rendered
- ✅ Settings modal used instead (existing SettingsPanel)
- ✅ Modal slides up from bottom
- ✅ No layout changes

---

## Z-Index Stacking

```
Layer 70   | ConversationVisualsPanel (overlay - highest priority)
Layer 60   | SettingsPanel modal (if on mobile or explicitly opened)
Layer 50   | Voice Chat Header (sticky)
Layer 50   | Unified Chat Input (fixed bottom)
Layer 30   | Settings Sidebar (docked right)
Layer 10   | Main content container
Layer 0    | Background animations
```

**Key:** Sidebar is BELOW header and input so it doesn't appear "too important"

---

## Animation/Transition Specifications

### Sidebar Toggle
- **Duration:** 300-350ms
- **Easing:** `ease-in-out` (smooth)
- **Type:** Horizontal slide from right edge
- **Distance:** 360px (full width)

### Interior Animations
- **Voice button selection:** `scale: 0.95` on tap
- **Toggle switch:** Animated circle movement (100-150ms)
- **Hover states:** `opacity` or `bg-color` transitions (200ms)
- **Dropdown:** Fade in/out (100-200ms)

### Language Dropdown
- **Open animation:** `initial={{ opacity: 0, y: -10 }}` → `animate={{ opacity: 1, y: 0 }}`
- **Duration:** 150ms
- **Easing:** spring or ease-out

---

## Accessibility Requirements

### Keyboard Navigation
- Tab through all interactive elements (buttons, toggles, dropdowns)
- Enter/Space to activate buttons
- Escape to close dropdown
- Arrow keys to navigate carousel (voice buttons)

### Focus Indicators
- Clear focus ring on all buttons
- High contrast for keyboard users
- Tab order: Top to bottom (left to right)

### Screen Reader Support
- `<aside>` semantic HTML
- Proper ARIA labels on toggles
- Button descriptions for context
- Section headings use `<h2>` or ARIA roles

### Color Contrast
- Text: 4.5:1 minimum (WCAG AA)
- Interactive elements: 3:1 minimum
- Current scheme: White on black/semi-transparent (good contrast)

---

## Edge Cases & Special States

### Empty/Loading States
- Not applicable (all settings have defaults)

### Scrolling Behavior
- Sidebar scrolls independently from messages
- When messages scroll, sidebar remains fixed
- Sidebar header remains sticky at top

### Very Small Desktop (800px window)
- Still shows sidebar (≥768px)
- Messages might feel cramped (max-w-3xl in 800px viewport)
- Consider warning in design docs: optimal at 1024px+

### Very Large Desktop (3840px wide)
- Sidebar docked right (360px)
- Messages centered with max-w-3xl (still readable)
- Large whitespace on left (acceptable, centered design)

---

## Voice Settings Page Consistency

### Existing Settings Page
- Located at `/orchestration/settings`
- Uses sidebar layout (AppSidebar from shadcn)
- Settings typically in left sidebar

### Voice Chat Settings Sidebar
- Settings in RIGHT sidebar (different from app-wide pattern)
- Rationale: Voice chat focuses user toward left (messages), settings accessible on right
- OK because it's context-specific to voice chat page

---

## Mobile/Tablet Settings (Unchanged)

**Mobile (< 768px):** 
- Use existing SettingsPanel modal
- Slides up from bottom
- Full-width (max-w-[428px] centered)
- No changes needed

---

## Future Enhancements

### Collapsible Sidebar
- Add collapse button (hamburger icon)
- Toggles between full sidebar and icons-only
- Saves viewport space for large messages

### Settings Persistence
- Remember sidebar visibility state
- Could persist to localStorage
- Sidebar open/closed on next visit

### Quick Settings Bar
- Show 2-3 most-used settings in header
- Voice selector quick access
- Speed quick access

### Settings History
- Recent settings snapshots
- "Reset to saved"
- Profile presets (work/personal/test)

---

## Performance Considerations

### Rendering
- Memoize SettingsSidebar component
- Avoid re-renders when messages update
- Use `useMemo` for expensive calculations

### Scrolling
- Sidebar scroll independent from messages scroll
- No synchronization needed (separate containers)
- CSS `contain: layout` on messages area for performance

### State Updates
- Settings updates via `onUpdateSettings` callback
- Debounce if needed (probably not needed for voice settings)
- No re-render thrashing

---

## Testing Scenarios

### Desktop (1920x1080)
1. Sidebar appears on right side
2. Click X → sidebar closes
3. Click kebab menu → Settings → sidebar opens
4. Change voice → applies immediately
5. Change language → applies immediately
6. Toggle captions → toggle animates
7. Scroll messages → sidebar stays fixed
8. Scroll sidebar → messages don't scroll
9. Click "Conversation Visuals" → overlay appears (above sidebar)
10. Close visuals overlay → back to sidebar

### Mobile (375x667)
1. Settings button in kebab menu
2. Click Settings → modal appears (from bottom)
3. All settings work as existing implementation
4. No sidebar visible

### Responsive (Resize from mobile to desktop)
1. Start at 375px → modal visible
2. Resize to 768px → modal closes, sidebar appears
3. Resize back to 375px → sidebar hidden, modal ready

---

## Summary

The sidebar provides a persistent, desktop-optimized settings interface that:
- Stays visible during voice conversations
- Enables real-time setting adjustments
- Maintains focus on the messages/chat area
- Scales gracefully to mobile (modal instead)
- Leverages existing settings infrastructure
- Follows established UI patterns (dark theme, Framer Motion, Tailwind)


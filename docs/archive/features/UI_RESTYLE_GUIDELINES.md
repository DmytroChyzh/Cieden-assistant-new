# FinPilot UI Restyling Guidelines

> **Purpose**: Single source of truth for front-end restyling tasks driven by new Figma designs. Share this file across chats so every assistant instance has the same context.

---

## 1  Scope & Philosophy

1. **User-Facing Only** – Focus exclusively on the *voice-chat flow* and its related components/pages. Ignore `/chat`, `/auth`, admin, or test pages for now.
2. **Functionality ≠ Design** – Do **not** alter or extend functionality unless explicitly approved. Visual parity with Figma is the primary goal.
3. **No New Components by Default** – Reuse & modify existing React components. If a Figma element has no counterpart, pause and ask for approval before creating anything new.
4. **Same Tech Stack** – Continue using Tailwind + shadcn/ui + Recharts + Framer Motion. Avoid introducing new styling libraries. Fonts/icon sets may be added *only* with approval.
5. **Pixel-Perfect** – Recreate styles *identically* to the Figma reference, not “close enough”.
6. **JSON-Driven** – The designer will supply full-page JSON exports (and, if needed, smaller component exports). Use them as the canonical style source.
7. **Icons Workflow**
   - Start by inlining SVGs from JSON exports.
   - Later, refactor selected icons to an agreed-upon icon library when instructed.
8. **Animations**
   - Preserve any existing animations.
   - New animations can be suggested but should not be implemented without approval.

---

## 2  Process Checklist (per restyled view)

1. **Analyse Figma JSON & screenshot** – Understand layout, tokens, breakpoints.
2. **Map Figma elements → existing components** – Record mapping before coding.
3. **Seek clarification** – If mapping is ambiguous *or* a new component seems required.
4. **Implement styling changes** – Tailwind/shadcn only; keep behaviour unchanged.
5. **Verify pixel-parity** – Compare against Figma at all breakpoints.
6. **Update _Completed Work Log_ below.**

---

## 3  Completed Work Log (keep brief)

| Screen / Component | Notes |
|--------------------|-------|
| Voice Chat Empty State | Implemented new design with Swarm background, central Orb, greeting text, and quick-action cards |
| Quick Actions Drawer | Restyled with MagicCard animated borders, Phosphor icons, and new color palette |
| Chat Input | Restyled to pill shape with dark translucent background, Phosphor icons |
| Voice Chat Header | Added new header with logo, bell icon, and avatar |
| Mobile Voice Chat UI (Figma Redesign) | Complete pixel-perfect redesign matching Figma specifications including: simplified AI swarm particle background, 200px AI loader orb without text, exact Figma typography (Inter 24px, -0.32px letter spacing), MagicCard hover animations for quick action cards with exact dimensions (172.5px × 101px for data cards, 172-173px × 68px for simple cards), redesigned bottom input with exact 56px height pill shape, lightning icon, and waveform send button. Added global CSS custom properties for Figma design tokens. |

> Update this table **immediately after** each successful restyle.

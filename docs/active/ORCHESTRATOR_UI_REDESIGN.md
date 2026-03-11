# Orchestrator Dashboard Redesign Plan (Linear 2026 Style)

## 1. Design Philosophy: "Modern Linear 2026"

The goal is to move away from the "generic SaaS/AI-generated" look (characterized by default Shadcn cards, heavy shadows, and distinct primary colors) to a "Linear-like" aesthetic.

**Core Principles:**
*   **Dark Mode Native:** The UI should feel best in dark mode, using `zinc` or `slate` scales (very dark greys) rather than pure black or light gray.
*   **Subtle Boundaries:** Use `border-white/5` or `border-border/40` instead of heavy borders.
*   **High Density:** Reduce padding (`p-4` instead of `p-6`), use smaller fonts (`text-sm` as default, `text-xs` for metadata), and `tracking-tight`.
*   **Refined Typography:** Use the existing `Geist` font but with careful weight distribution. Headings should be `font-medium` rather than `font-bold`.
*   **Minimal Status Indicators:** Replace solid colored badges with:
    *   Status dots (6px w/h) with a glow.
    *   Subtle text coloring (`text-zinc-400`).
    *   `variant="outline"` badges with low opacity backgrounds (`bg-blue-500/10 text-blue-400 border-blue-500/20`).
*   **Glassmorphism & Blur:** Use `backdrop-blur-md` for sticky headers and overlays, but keep it subtle.
*   **Motion:** Add subtle `hover` states (e.g., `hover:bg-white/[0.02]`) to interactive elements.

## 2. Global Layout Changes (`app/orchestration/layout.tsx`)

*   **Sidebar:** Ensure seamless integration with the main content. The main content background should match or slightly contrast with the sidebar.
*   **Header:**
    *   **Current:** Sticky, `h-14`, solid border-b.
    *   **Redesign:**
        *   Keep sticky but make it `bg-background/80 backdrop-blur-md`.
        *   Remove the solid `border-b` or replace it with a very subtle `border-b border-white/5`.
        *   Reduce height to `h-12` for higher density.
        *   Integrate breadcrumbs if applicable.
*   **Main Area:**
    *   Change padding from `p-6` to `p-4` or `p-6` (but with tighter inner spacing).
    *   Ensure `overflow-y-auto` behaves correctly with the sticky header.

## 3. Page-Specific Redesigns

### 3.1. Dashboard (`app/orchestration/page.tsx`)

*   **Header Section:**
    *   Remove "Good morning" large text. Replace with a minimal page title "Dashboard" and a date/time indicator or a subtle welcome message.
    *   **Quick Actions:** Convert huge buttons to a compact `Toolbar` or a row of small `Button` components (`variant="outline"`, `size="sm"`).
*   **Fleet Stats (Top Row):**
    *   **Current:** 4 Cards with icons and big numbers.
    *   **Redesign:** A single grid container. Remove card backgrounds; use dividers.
    *   **Style:** `text-muted-foreground` labels (uppercase, text-xs, tracking-wider). Large, thin numbers for values. Sparkline or small trend arrow (no text "from yesterday" unless necessary, or make it very subtle).
*   **Active Sessions:**
    *   **Current:** Card with list of items.
    *   **Redesign:** "Flat" list.
    *   **Table View:** Headers in `text-xs text-muted-foreground`. Rows with `hover:bg-white/[0.02]`.
    *   **Status:** Pulsing dot for "analyzing/optimizing". Text status right-aligned.
    *   **Tags:** Outline badges for "Small Business", "High Net Worth".
*   **Fleet Performance:**
    *   **Current:** Card with progress bars.
    *   **Redesign:** Minimal bars (`h-1.5`, rounded-full). Colors should be desaturated (e.g., `bg-zinc-700` track, `bg-indigo-500` fill).
*   **Draft Agents:**
    *   **Current:** Card with detailed list.
    *   **Redesign:** Compact list. Show "Stage" as a timeline step (e.g., "Step 3/5: QA").

### 3.2. Agents Management (`app/orchestration/agents/page.tsx`)

*   **Header:**
    *   Merge search and filters into a single "Control Bar".
    *   Use `Command` style input (search + filter in one).
*   **Grid:**
    *   **Cards:** Remove default shadow. Use `border border-white/5 bg-zinc-900/50`.
    *   **Hover:** `group-hover:border-white/10 transition-colors`.
*   **Agent Card Content:**
    *   **Icon:** Monochromatic or subtle gradient background `bg-zinc-800`.
    *   **Status:** Top-right indicator (green dot for active).
    *   **Performance:** Mini sparkline or just the percentage number in `font-mono`.
    *   **Capabilities:** Small tags (`text-[10px]`, `px-1.5`, `py-0.5`).
    *   **Actions:** Show "Configure/Monitor" buttons only on hover (reduce visual noise).

### 3.3. Workflows (`app/orchestration/workflows/page.tsx`)

*   **Layout:** Master-Detail view is effective.
*   **Master List (Left):**
    *   Compact items.
    *   Status indicator: Vertical colored line on the left edge or a dot.
    *   Selected state: `bg-white/[0.04]` + `border-l-2 border-primary`.
*   **Detail View (Right):**
    *   **Visual Pipeline:** Draw a vertical line connecting steps.
    *   **Step Item:**
        *   Icon (Check/Spinner) inside a circle on the line.
        *   Title and Agent Name inline.
        *   Duration right-aligned `font-mono text-xs text-muted-foreground`.

### 3.4. Tool Testing (`app/orchestration/tools/page.tsx`)

*   **Current:** Very colorful, heavy gradients.
*   **Redesign:** "Pro" Developer Tool look.
    *   **Cards:** Dark background (`bg-zinc-950`). Border `border-white/10`.
    *   **Accents:** Use color only for the icon and a tiny indicator line.
    *   **Selection:** When selected, add a subtle glow `shadow-[0_0_15px_-3px_rgba(var(--primary),0.1)]`.
*   **Configuration Panel:**
    *   Use `Label` with `text-xs uppercase tracking-wider text-muted-foreground`.
    *   Inputs: `h-8`, `bg-zinc-900`, `border-zinc-800`.
*   **Results Console:**
    *   Make it look like a terminal. `font-mono`, `text-xs`, `bg-[#0D0D0D]`.
    *   Green/Red text for success/error logs.

## 4. Implementation Steps

1.  **Phase 1: Layout & Dashboard**
    *   Update `layout.tsx`.
    *   Refactor `page.tsx` (Dashboard) with new "StatsGrid" and "SessionList" components.
2.  **Phase 2: Agents & Workflows**
    *   Apply the "Linear Card" style to `agents/page.tsx`.
    *   Refine `workflows/page.tsx` list and detail components.
3.  **Phase 3: Tools & Polish**
    *   Refactor `tools/page.tsx` to reduce color saturation.
    *   Global pass on typography and spacing.

# The Council — Accessibility Audit & Report (`docs/A11Y_REPORT.md`)

This report documents the accessibility evaluations, WCAG 2.2 Level AA compliance verification, keyboard navigation mechanics, screen reader semantics, and performance budgets for **The Council** (`the-council`).

---

## 1. Automated Compliance Summary (Axe Core)

Automated accessibility tests are executed in Playwright via `@axe-core/playwright` as part of the primary CI verification suite (`tests/e2e/council.spec.ts`).

- **Target Standard:** WCAG 2.2 Level AA, Section 508.
- **Results:**
  - Desktop Chromium: **0 violations** (Critical: 0, Serious: 0, Moderate: 0, Minor: 0).
  - Mobile Chrome (Pixel 7 emulation): **0 violations** (Critical: 0, Serious: 0, Moderate: 0, Minor: 0).
- **Routes Audited:**
  - `/` (Question Composer, Persona Grid, Dilemma Templates)
  - `/session/:id` & `/c/:id` (The Round Table, Live Stream, Transcript, Verdict Card)
  - `/history` (Session List, Search, Filter Badges)
  - `/settings` (API Key Manager, Spend Headroom Meter, Preferences)
  - `/diagnostics` (Database Metrics, Engine Probes, System Health)
  - `/dev/ui` (Component Living Catalog in Light and Dark themes)

---

## 2. Keyboard Operability & Focus Architecture

1. **Global Shortcuts:**
   - `Ctrl+K` / `Cmd+K`: Opens the Command Palette from any page.
   - `Escape`: Closes open modals, drawers, and command palettes, restoring focus to the triggering element.
2. **The Round Table Seating Navigation:**
   - The circular table seats are focusable interactive nodes.
   - **Arrow Key Navigation:** Pressing `ArrowRight` or `ArrowDown` steps clockwise to the next seated persona; `ArrowLeft` or `ArrowUp` steps counter-clockwise.
   - `Enter` / `Space`: Opens the deep persona detail drawer for the focused seat.
   - Focus rings: High-contrast `ring-2 ring-primary ring-offset-2 ring-offset-background` ensures unambiguous active focus.
3. **Modal Focus Traps:**
   - Both `CommandPalette.tsx` and `PersonaDrawer.tsx` capture keyboard tab cycles within the modal boundaries and return focus to the previous active element upon dismissal.
4. **Accessible Alternative (List View):**
   - The Round Table includes an accessible **List View toggle** button (`aria-label="Toggle list view"`).
   - When engaged, the spatial 2D SVG canvas transforms into an accessible linear card deck, displaying persona seats, current speaker status, and alignment confidence without requiring spatial orientation.

---

## 3. Screen Reader Semantics & ARIA Landmarks

1. **Landmarks:**
   - Header navigation: `<nav aria-label="Main Navigation">`
   - Main content: `<main>`
   - Deliberation Chamber: `<section aria-label="Deliberation Chamber">`
   - Round Table: `<div role="region" aria-label="The Council Round Table">`
2. **Live Updates (`aria-live`):**
   - Live stream updates use `aria-live="polite"` with throttled announcements to prevent speech buffer saturation during rapid SSE cross-examination bursts.
   - The central convergence score features `aria-live="polite"` announcing major threshold milestones (e.g., "Consensus reached: 100% alignment").
3. **No Color-Only Meaning:**
   - Every persona is identified by a unique name, title, and Lucide glyph in addition to their assigned accent color.
   - Stance arcs (AGREE, CHALLENGE, CONCEDE) are paired with explicit textual stance badges in the transcript stream and tooltip overlays.
   - Final verdicts explicitly render textual status tags (`Unanimous Verdict` or `Consensus Not Fully Reached`) alongside iconography.

---

## 4. Contrast & Typography

- **Text Contrast:** All body text meets or exceeds the WCAG AA minimum contrast ratio of `4.5:1` against backgrounds in both dark and light modes.
  - Light mode: Deep slate `#0f172a` on pure white / translucent glass.
  - Dark mode: Crisp off-white `#f8fafc` on dark obsidian `#090d16`.
- **UI Element Contrast:** Interactive borders and button states exceed `3:1` contrast ratio.
- **Tabular Numerals:** Confidence percentages and clock timers utilize `font-mono tabular-nums` to eliminate jitter and maintain readability.

---

## 5. Motion & Performance Budgets

1. **Reduced Motion (`prefers-reduced-motion`):**
   - All pulsating halo rings, SVG arc transitions, and table perspective tilts gracefully downgrade to static borders and immediate state changes when `prefers-reduced-motion: reduce` is detected.
2. **First Load JavaScript Budget:**
   - Shared first load JS across all routes: **103 KB** (budget: $\le 150\text{ KB}$).
   - Total landing page JS: **137 kB**.
3. **Cold Start:**
   - Static prerendering for static routes with on-demand dynamic rendering for session chambers ensures sub-2s initial paint times.

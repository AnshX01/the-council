# Atlas Design Inventory & Council Design System (`docs/DESIGN_SYSTEM.md`)

> **Source Reference:** `C:\Users\anshw\Documents\Atlas\frontend`  
> **Target:** The Council (`src/components/ui/*`, `src/app/globals.css`, `tailwind.config.ts`)  
> **Philosophy:** Apple-tier minimalism, Monterey-style glassmorphism, Inter variable typography, near-monochrome neutral base with vibrant persona-specific accents, rage-click defense, and 60fps GPU-accelerated motion.

---

## 1. Design Tokens Specification

### 1.1 Color Tokens (Light & Dark)

Atlas utilizes CSS variables mapped to Tailwind utility tokens:

```css
:root {
  /* Light Mode Base */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-glass: rgba(255, 255, 255, 0.72);
  --bg-glass-elevated: rgba(255, 255, 255, 0.88);

  --text-primary: #09090b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  --border-default: rgba(0, 0, 0, 0.08);
  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-focus: rgba(0, 0, 0, 0.25);

  --accent: #18181b;
  --accent-hover: #09090b;
  --accent-glow: rgba(0, 0, 0, 0.08);

  /* Atlas Core Brand */
  --atlas-blue: #3b82f6;
  --atlas-blue-dim: #1d4ed8;
  --atlas-blue-glow: rgba(59, 130, 246, 0.15);

  /* Status Colors */
  --status-urgent: #ef4444;
  --status-high: #f97316;
  --status-medium: #eab308;
  --status-low: #22c55e;
}

.dark {
  /* Dark Mode Base — Pure Monterey Black */
  --bg-primary: #000000;
  --bg-secondary: #111113;
  --bg-tertiary: #18181b;
  --bg-glass: rgba(17, 17, 19, 0.75);
  --bg-glass-elevated: rgba(24, 24, 27, 0.85);

  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --text-muted: #52525b;

  --border-default: rgba(255, 255, 255, 0.08);
  --border-subtle: rgba(255, 255, 255, 0.04);
  --border-focus: rgba(255, 255, 255, 0.25);

  --accent: #e4e4e7;
  --accent-hover: #ffffff;
  --accent-glow: rgba(255, 255, 255, 0.12);

  --atlas-blue: #3b82f6;
  --atlas-blue-dim: #60a5fa;
  --atlas-blue-glow: rgba(59, 130, 246, 0.25);
}
```

### 1.2 Persona Palette (The Sole Saturated Accents)

The Council's identity comes from its persona colors mapped across badges, glyph tiles, arcs, and speech glows:

| Persona | Hex Code | Purpose / Tone |
| :--- | :--- | :--- |
| **Moderator** | `#64748B` (Slate) | Impartial, dignified gavel/scribe icon, non-voting mark |
| **The Skeptic** | `#0EA5E9` (Sky Blue) | Empirical inquiry, assumption hunter |
| **The Optimist** | `#10B981` (Emerald Green) | Constructive agency, opportunity scout |
| **The Ethicist** | `#6366F1` (Indigo) | Deontological duty, rights, moral protection |
| **The Pragmatist** | `#3B82F6` (Atlas Blue) | Operational friction, concrete execution |
| **Systems Thinker** | `#8B5CF6` (Violet) | Feedback loops, second-order effects |
| **The Historian** | `#D97706` (Amber) | Precedent, historical analogies |
| **The Humanist** | `#EC4899` (Pink) | Lived human experience, dignity |
| **The Contrarian** | `#EF4444` (Rose / Red) | Devil's advocate, majority stress-test |

### 1.3 Typography Scale (`next/font/google` Inter)

Retire `Cinzel`. Strictly use `Inter` variable with tabular numerals for scores and confidence metrics:

```css
body {
  font-family: var(--font-sans, "Inter"), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- **H1:** `2rem` (32px), `font-weight: 700`, `letter-spacing: -0.03em`, `line-height: 1.2`
- **H2:** `1.5rem` (24px), `font-weight: 600`, `letter-spacing: -0.02em`, `line-height: 1.3`
- **H3:** `1.25rem` (20px), `font-weight: 600`, `letter-spacing: -0.01em`, `line-height: 1.4`
- **H4 / Subheader:** `1rem` (16px), `font-weight: 600`, `line-height: 1.5`
- **Body:** `0.875rem` (14px), `line-height: 1.6`, color `var(--text-secondary)`
- **Caption / Meta:** `0.75rem` (12px), `line-height: 1.4`, color `var(--text-muted)`
- **Micro / 2xs:** `0.625rem` (10px), uppercase, tracking `0.05em`

### 1.4 Radii, Blur, Shadows & Spacing

- **Border Radii:**
  - `sm`: `6px`
  - `md`: `10px`
  - `lg`: `14px`
  - `xl`: `20px`
  - `2xl`: `24px`
  - `full`: `9999px`
- **Backdrop Blur:**
  - Standard glass: `blur(20px) saturate(180%)`
  - Deep glass / modals: `blur(28px) saturate(190%)`
- **Layered Shadows:**
  - `shadow-glass`: `0 8px 32px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)`
  - `shadow-glow`: `0 0 24px rgba(59, 130, 246, 0.25)`
  - `shadow-glow-persona`: `0 0 20px <persona-color-with-alpha>`
- **Motion Durations & Easings:**
  - Standard Spring: `cubic-bezier(0.16, 1, 0.3, 1)`
  - Quick tap: `150ms`
  - Modal entrance: `220ms`
  - Stream burst: transform/opacity GPU transitions only; honors `prefers-reduced-motion: reduce`.

---

## 2. Atlas Component Reuse & Adaptation Matrix

| Council Need | Reused / Adapted Atlas Component | Atlas Source Path | Adaptations for Council |
| :--- | :--- | :--- | :--- |
| **Primary / Secondary Button** | `Button` | `Atlas/frontend/src/components/ui/Button.tsx` | Add rage-click defense (`debounceMs`, `isActionPending`), disabled states, focus rings. |
| **Text Inputs & Search** | `Input`, `SearchInput` | `Atlas/frontend/src/components/ui/Input.tsx` | Character count indicators, shortcut labels (`⌘K`), error states. |
| **Command Palette** | `CommandPalette` | `Atlas/frontend/src/components/layout/CommandPalette.tsx` | Permanent top-bar launcher, keyboard shortcuts (`⌘K`), session search, rerun, export, diagnostics. |
| **Status / Category Badges** | `Badge` | `Atlas/frontend/src/components/ui/Badge.tsx` | Support persona accent colors, voting state badges (`SIGN_OFF`, `AMENDMENT`, `OBJECT`). |
| **Glass Containers** | `GlassCard`, `AgentDesignSystemShell` | `Atlas/frontend/src/components/ui/AgentDesignSystemShell.tsx` | Translucent backdrop blur, hairline borders, elevated hover interactions. |
| **Loading Skeletons** | `Skeleton`, `SearchSkeleton` | `Atlas/frontend/src/components/ui/Skeleton.tsx` | Pulse animation for transcript streams and history listings. |
| **Spinners** | `Spinner` | `Atlas/frontend/src/components/ui/Spinner.tsx` | SVG spinner with stroke animation. |
| **Offline Banner** | `OfflineBanner` | `Atlas/frontend/src/components/ui/OfflineBanner.tsx` | Auto-detect network disconnect, SSE reconnect indicator. |
| **Toasts** | `Toast` | `Atlas/frontend/src/components/ui/Toast.tsx` | Accessible alerts for copy verdict, export downloads, spend cap warnings. |
| **Onboarding Wizard** | `OnboardingWizard` | `Atlas/frontend/src/components/layout/OnboardingWizard.tsx` | Glass modal explaining 6-phase protocol, key setup + "Test Key" + Mock mode option. |
| **Navigation & Sidebar** | `Sidebar` | `Atlas/frontend/src/components/layout/Sidebar.tsx` | Top-bar + sidebar hybrid for history, settings, diagnostics. |
| **Error Boundary** | `ErrorBoundary` | `Atlas/frontend/src/components/ui/ErrorBoundary.tsx` | Atlas glass error card with "Retry", "Export State", and "Report". |

---

## 3. New Components Indistinguishable in Atlas Style

| Component | Description | Location |
| :--- | :--- | :--- |
| **`RoundTable`** | Circular SVG/HTML table seating 9 members (Moderator at 0° / 12 o'clock, 8 voting members spaced 40° apart), convergence ring, dynamic stance arcs (`AGREE` solid, `CHALLENGE` dashed, `CONCEDE` dotted), confidence rings, live speaking glow. | `src/components/council/RoundTable/RoundTable.tsx` |
| **`SeatNode`** | Glass avatar tile on table rim with persona glyph, confidence ring, delta chip, status dot (idle / thinking / speaking / unavailable), focusable button with full keyboard navigation. | `src/components/council/RoundTable/SeatNode.tsx` |
| **`InteractionArc`** | SVG cubic Bezier arcs between speaker and addressed peers across the table, colored by speaker and styled by stance. | `src/components/council/RoundTable/InteractionArc.tsx` |
| **`VerdictSeal`** | Center table medallion resolving to Unanimous seal (green tick) or Consensus Not Fully Reached seal (dignified slate balance scales). | `src/components/council/RoundTable/VerdictSeal.tsx` |
| **`ReplayScrubber`** | Scrub bar at table base allowing 1x/2x/4x replay of historical deliberations step by step. | `src/components/council/RoundTable/ReplayScrubber.tsx` |
| **`PersonaDrawer`** | Slide-out glass drawer when tapping a seat: core lens, blind spots, confidence sparkline, history of contributions. | `src/components/council/RoundTable/PersonaDrawer.tsx` |
| **`QuestionComposer`** | Minimal glass composer with character counter, example prompts, template chips, and modal options. | `src/components/council/QuestionComposer.tsx` |
| **`TranscriptStream`** | Virtualized, throttled feed with stance badges, collapsible reasoning, and "jump to latest" pill. | `src/components/council/TranscriptStream.tsx` |

---

## 4. Visual Catalog Route: `/dev/ui`

A living development-only catalog route `/dev/ui` renders:
- Every variant of `Button`, `Input`, `Badge`, `GlassCard`, `Modal`, `Toast`, `Skeleton`.
- The `RoundTable` in all operational states (idle, thinking, speaking with arcs, voting ballots, unanimous verdict, deadlock, unavailable seat).
- Dark and light theme toggle preview.

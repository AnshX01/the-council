# UI Parity & Verification Report: "The Council" -> Atlas-Grade Interface

**Date:** 2026-10-02  
**Target Git Branch:** `ui/atlas-overhaul`  
**Reference Repo:** `AnshX01/Atlas` (`frontend/`)  
**Product Repo:** `AnshX01/the-council`  

---

## 1. Executive Summary

The Council's frontend layer has been completely overhauled to match the authentic design DNA of **Atlas** (`AnshX01/Atlas`). The previous noisy, border-heavy, multi-colored UI has been replaced with Atlas's **flat, borderless, shadowless, monochrome** design system, Inter typography, spring physics, and desktop grid shell (220px sidebar + 1fr main), with persona colors serving as the **only** chroma.

The **Round Table v3** is now the centerpiece of the application: a 9-seat circular amphitheater placing the non-voting Moderator at the head, surrounded symmetrically by 8 autonomous personas, with dynamic quadratic Bezier interaction arcs and a central `VerdictSeal` medallion tracking real-time convergence and ratification rings.

All 12 targeted UI/UX and data plumbing bugs (B1–B12) have been resolved and verified with automated tests. The complete quality gate is green.

---

## 2. Verification Gate Results

| Check | Tool / Command | Result | Evidence |
|---|---|---|---|
| **Design Linter** | `npm run lint:design` (`scripts/lint-design.ts`) | **PASSED** | 0 violations across 58 UI files |
| **Secrets Hygiene** | `vitest tests/unit/noLocalStorageApiKey.test.ts` | **PASSED** | 0 localStorage API key leaks in `src/` |
| **Token Parity** | `vitest tests/unit/tokenParity.test.ts` | **PASSED** | 100% token parity against Atlas snapshot |
| **TypeScript** | `npm run typecheck` (`tsc --noEmit`) | **PASSED** | 0 TypeScript errors across the repo |
| **Unit & Integration** | `npm test` (`vitest run`) | **PASSED** | 25/25 test files, 155/155 tests passed (incl. 6/6 golden invariants) |
| **ESLint** | `npm run lint` (`next lint`) | **PASSED** | 0 ESLint warnings or errors |
| **Next.js Build** | `npm run build` (`next build`) | **PASSED** | 14 static and dynamic routes compiled cleanly |
| **End-to-End Suite** | `npm run test:e2e` (`playwright test` on port 3100) | **PASSED** | 28/28 tests passed (14 Chromium, 14 Mobile Chrome) |

---

## 3. Design DNA & Token Parity

### Exact Atlas Tokens Implemented (`src/app/globals.css` & `tailwind.config.ts`)

| Token Category | Atlas Variable | Value (Dark) | Value (Light) | Role in The Council |
|---|---|---|---|---|
| **Base Background** | `--bg-primary` | `#000000` (Atlas Black) | `#ffffff` | Page root & canvas background |
| **Secondary Surface** | `--bg-secondary` | `#111113` | `#f8fafc` | Cards, panels, input surface, sidebar |
| **Tertiary Surface** | `--bg-tertiary` | `#18181b` | `#f1f5f9` | Hover states, pill badges, code blocks |
| **Frosted Glass** | `--bg-glass` | `rgba(17,17,19,0.8)` | `rgba(255,255,255,0.7)` | Modal backdrop, sticky headers (border: none) |
| **Primary Text** | `--text-primary` | `#ffffff` | `#000000` | Headings, active icons, input text |
| **Secondary Text** | `--text-secondary` | `#a1a1aa` | `#475569` | Body paragraphs, persona reasoning |
| **Muted Text** | `--text-muted` | `#52525b` | `#94a3b8` | Metadata, timestamps, captions |
| **Default Border** | `--border-default` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Subtle structural separators |
| **Subtle Border** | `--border-subtle` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.04)` | Ultra-faint row dividers |
| **Neutral Accent** | `--accent` | `#e4e4e7` | `#18181b` | Active toggle, primary button fill |
| **Status Urgent** | `--status-urgent` | `#ef4444` | `#ef4444` | Dissent indicator, failed checks |
| **Status High** | `--status-high` | `#f97316` | `#f97316` | High tension objection arcs |
| **Status Medium** | `--status-medium` | `#eab308` | `#eab308` | Warning, deliberation in progress |
| **Status Low** | `--status-low` | `#22c55e` | `#22c55e` | Unanimous verdict, consensus reached |

### Typography & Motion Principles
- **Font Stack:** Inter (via `next/font/google`, `--font-sans`) for UI and headings; `JetBrains Mono` (`--font-mono`) for timestamps, token counters, session IDs, and code blocks.
- **Section Labels:** All uppercase tracking-widest section labels use `text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase`.
- **Spring Physics:** Framer Motion spring transition configured identically to Atlas: `{ type: "spring", stiffness: 400, damping: 30 }` for modals, popovers, and page transitions; `{ scale: 0.97 }` for `whileTap` button interactions.

---

## 4. Component Mapping: Atlas -> The Council

| Atlas Source Component (`Atlas/frontend`) | The Council Target Component | File Location | Lines | Design Parity Notes |
|---|---|---|---|---|
| `components/ui/Button.tsx` | `Button.tsx` | `src/components/ui/Button.tsx` | 89 | Flat, borderless tonal fills (`primary`, `secondary`, `ghost`, `danger`), whileTap 0.97 |
| `components/ui/Input.tsx` | `Input.tsx`, `SearchInput.tsx` | `src/components/ui/Input.tsx` | 134 | Borderless input on `bg-secondary` / `bg-tertiary`, left/right icon adornments |
| `components/ui/Badge.tsx` | `Badge.tsx` | `src/components/ui/Badge.tsx` | 65 | Rounded-full tonal badges with subtle status tint and dot indicator (`xs`, `sm`, `md`) |
| `components/ui/Toggle.tsx` | `Toggle.tsx` | `src/components/ui/Toggle.tsx` | 42 | Smooth sliding spring switch with neutral accent thumb |
| `components/ui/Slider.tsx` | `Slider.tsx` | `src/components/ui/Slider.tsx` | 74 | Flat track, interactive draggable thumb, mono value readout |
| `components/ui/Tabs.tsx` | `Tabs.tsx` | `src/components/ui/Tabs.tsx` | 73 | Segmented pill tabs with spring-animated active indicator |
| `components/ui/Skeleton.tsx` | `Skeleton.tsx` | `src/components/ui/Skeleton.tsx` | 24 | Subtle pulse skeleton on `bg-secondary` |
| `components/ui/Spinner.tsx` | `Spinner.tsx` | `src/components/ui/Spinner.tsx` | 29 | Minimal monochrome circular loader |
| `components/ui/Toast.tsx` | `Toast.tsx` | `src/components/ui/Toast.tsx` | 78 | Re-exported `react-hot-toast` with Atlas monochrome styling |
| `components/ui/Surface.tsx` | `Surface.tsx` | `src/components/ui/Surface.tsx` | 46 | Borderless tonal card container with optional hover effect |
| `components/ui/ErrorBoundary.tsx` | `ErrorBoundary.tsx` | `src/components/ui/ErrorBoundary.tsx` | 74 | Class-based error boundary with recovery action |
| `components/ui/OfflineBanner.tsx` | `OfflineBanner.tsx` | `src/components/ui/OfflineBanner.tsx` | 55 | Top banner indicating network status |
| `components/layout/AppShell.tsx` | `AppShell.tsx` | `src/components/layout/AppShell.tsx` | 114 | Desktop grid shell (220px sidebar + 1fr main), ambient radial orbs, mobile header |
| `components/layout/Sidebar.tsx` | `Sidebar.tsx` | `src/components/layout/Sidebar.tsx` | 327 | Fixed left navigation with brand header, nav links, spend meter, and theme toggle |
| `components/layout/CommandPalette.tsx` | `CommandPalette.tsx` | `src/components/layout/CommandPalette.tsx` | 358 | `Ctrl+K` quick switcher, Fuse.js fuzzy search, recent deliberations, actions |
| `components/layout/OnboardingWizard.tsx` | `OnboardingWizard.tsx` | `src/components/layout/OnboardingWizard.tsx` | 280 | 3-step setup modal with server-only key verification and demo mode fallback |
| `components/layout/PageTransition.tsx` | `PageTransition.tsx` | `src/components/layout/PageTransition.tsx` | 32 | Framer Motion spring fade/slide page transition wrapper |
| `app/settings/page.tsx` | `SettingsPage` | `src/app/settings/page.tsx` | 623 | Left sub-nav (Engine, Budget, Appearance, Data, Shortcuts, About) with `Surface` |
| `app/dashboard/page.tsx` | `DiagnosticsPage` | `src/app/diagnostics/page.tsx` | 314 | System health inspection for SQLite WAL, Durable Runner, and LLM Provider |
| `app/dev/ui/page.tsx` | `DesignSystemCatalogPage` | `src/app/dev/ui/page.tsx` | 282 | Living design system gallery with interactive Round Table state simulator |

---

## 5. Centerpiece: The Round Table v3

The centerpiece of The Council deliberation chamber is the **Round Table v3** (`src/components/council/RoundTable/RoundTable.tsx`), designed to present multi-agent dialectics as a living, spatial amphitheater:

1. **Amphitheater Geometry (`src/lib/ui/geometry.ts`):**
   - **9 Seats Total:** 1 Moderator + 8 autonomous personas.
   - **Moderator at the Head:** Positioned at `angle = 0°` (top), rendered on a raised rectangular pedestal with a crown icon and `CHAIR` badge.
   - **8 Personas in a Circle:** Arranged symmetrically at `[-140°, -100°, -60°, -20°, 20°, 60°, 100°, 140°]`, reserving the bottom space for the controls and verdict drawer.
2. **Dynamic Quadratic Bezier Arcs (`InteractionArc.tsx`):**
   - Arcs between debating personas are computed via `calculateArcCurve(source, target)`.
   - Curve tension and color adapt to stance:
     - `CHALLENGE`: High arch, amber/red tension gradient.
     - `AGREE` / `SYNTHESIZE`: Smooth, lower arch with subtle glow.
3. **The Centerpiece `VerdictSeal` (`VerdictSeal.tsx`):**
   - Live SVG convergence ring tracking convergence score (0% to 100%).
   - Threshold marker tick indicating 80% supermajority requirement.
   - 8-segment ratification ring during Phase 4 & 5 displaying individual persona sign-offs, amendments, and dissents in their persona chroma.
   - Central resolution badge (`UNANIMOUS` with green checkmark or `DISSENT` with balanced scales).
4. **Persona Chroma as the Only Hue:**
   - Personas retain their unique dialectic accent colors (Skeptic = Cyan, Ethicist = Emerald, Pragmatist = Amber, etc.).
   - All surrounding chamber UI is monochrome (`#000000`, `#111113`, `#18181b`, `#e4e4e7`).
5. **Persona Detail Drawer (`PersonaDrawer.tsx`):**
   - Slide-over inspection sheet detailing Core Values, Reasoning Style, Blind Spots, and dynamic radar/trajectory scores.
6. **Dual-View Support:**
   - One-click toggle between circular Round Table view and chronological linear feed.

---

## 6. Bug Resolutions (B1 through B12)

| Bug ID | Title & Issue | Root Cause | Fix Summary | Automated Verification Proof |
|---|---|---|---|---|
| **B1** | Legacy `/session/:id` route redirect | Old links failed after chamber route migration to `/c/:id` | Added server redirect in `src/app/session/[id]/page.tsx` | E2E test `Session chamber handles non-existent session with user-friendly error state` navigates through redirect cleanly |
| **B2** | LocalStorage API key leaks | Client code persisted `the_council_gemini_api_key` to browser `localStorage` | Replaced all client storage with server environment variable truth (`.env.local`) | `tests/unit/noLocalStorageApiKey.test.ts` scans all 58 UI files and confirms 0 localStorage API key patterns |
| **B3** | Client Gemini key state out of sync | Client assumed key was active without querying server | `useEngineStatus` hook queries `/api/v1/health` to confirm server-side key status | `tests/integration/apiV1.test.ts` & settings page verify server key state |
| **B4** | Personal spend headroom meter missing | No user visibility into spend against monthly budget cap | Added live headroom meter in `src/app/settings/page.tsx` consuming `/api/v1/usage` | E2E test `Settings page renders API key tester and personal spend headroom meter` |
| **B5** | Diagnostics probe payload unwrapping | Diagnostics page failed to parse `{ ok: true, data: { ... } }` response format | Updated parser to handle unwrapped and enveloped data bodies | E2E test `Diagnostics page renders live SQLite WAL and background runner probe payloads` |
| **B6** | Round table seating geometry flawed | Personas were misaligned without dedicated Moderator head position | Implemented radial polar-to-cartesian geometry in `src/lib/ui/geometry.ts` | `tests/unit/geometry.test.ts` (8 tests passing) |
| **B7** | Missing dynamic interaction arcs | Debates between personas lacked visual directional connection | Implemented SVG quadratic Bezier arcs in `InteractionArc.tsx` | Tested in `geometry.test.ts` and Dev UI catalog |
| **B8** | Missing central convergence seal | Center of table was an empty static circle | Implemented `VerdictSeal.tsx` with live convergence progress and 8-seat ratification segments | Tested in `dev/ui` E2E test in speaking, voting, unanimous, and deadlock states |
| **B9** | Persona modal hydration mismatch & escaping errors | Unescaped quotes and missing blindspots handling caused hydration failure | Fixed JSX quotes with HTML entities, handled string/array blindspots safely in `PersonaDrawer.tsx` | E2E test `Persona modal displays deep profile details and closes` |
| **B10** | Non-Atlas styling and borders throughout UI | Outlines, arbitrary colors, and Tailwind shadow classes violated Atlas DNA | Complete rewrite with Atlas tokens, borderless glass, Inter font, and spring physics | `npm run lint:design` (0 violations) and `tokenParity.test.ts` |
| **B11** | Command palette shortcuts broken | Cmd+K did not navigate or open on global keypress; Fuse distance penalty rejected matches | Added `ignoreLocation: true` to Fuse.js, autoFocus input, and `role="dialog"` modal | E2E test `Command Palette opens with shortcut and navigates to pages` |
| **B12** | Duplicate submission on rapid mashing (Rage-click) | Rapid clicking created duplicate sessions in SQLite | Debounced convene button and disabled on submission in `src/app/page.tsx` | E2E test `Rage-click defense prevents duplicate submission on rapid mashing` |

---

## 7. Captured Visual Proof & Screenshots

The following production screenshots were captured directly by Playwright during the E2E test run on port 3100:

1. **Desktop Landing Page (Dark Mode):**  
   Path: `test-results/screenshots/landing-desktop-dark.png`  
   *Proof:* Demonstrates flat `#000000` canvas, Atlas Inter typography, uppercase tracking-widest section labels, ChatInput compose area with bottom pill toolbar (`3 Rounds`, `Template`, `gemini-2.5-flash`), and suggested inquiry cards.
2. **Desktop Landing Page (Light Mode):**  
   Path: `test-results/screenshots/landing-desktop-light.png`  
   *Proof:* Validates seamless theme toggle switching to pure white `#ffffff` canvas with high-contrast neutral borders (`rgba(0,0,0,0.08)`).
3. **Mobile Landing Viewport (375x667):**  
   Path: `test-results/screenshots/landing-mobile.png`  
   *Proof:* Verifies responsive header bar with slide-over drawer toggle, theme switcher, LOCAL badge, and stacked inquiry cards.
4. **Session Deliberation Chamber & Verdict:**  
   Path: `test-results/screenshots/session-chamber-verdict.png`  
   *Proof:* Shows full chamber with 6-phase stepper, 9-seat Round Table amphitheater with Moderator at the head (`CHAIR`), persona confidence indicators, central `VerdictSeal` with unanimous checkmark, and verdict tabs.

---

## 8. Conclusion

The Council's UI layer now represents a true **Atlas-grade interface**. All legacy components have been safely excised, all design tokens match `AnshX01/Atlas` with 100% mathematical parity, and the entire test pyramid (from design lints and unit tests up to full multi-browser Playwright E2E suites) is completely green.

# The Council — Overhaul Fix Report (P0 Live Gemini & P1/RT4 Round Table)

**Branch:** `ui/fix-live-and-polish`
**Status:** Complete & Fully Verified

---

## 1. Executive Summary
This overhaul resolved the critical P0 defect where The Council operated exclusively in simulated mode regardless of user API key entry, and completed all Round Table v4 ("Effortless") interface, geometry, and layout fixes (R1–R10). All test suites across Vitest unit/integration (171 passed), Next.js production compilation, Playwright E2E (28 passed), and design linting (0 violations) are green.

---

## 2. Part 1 (P0): Live Gemini Mode Activation & Root Causes

### Root Causes Diagnosed
1. **Key Ephemerality & Lack of Server Persistence:** `PatchSettingsSchema` previously had no API key field; keys pasted into Settings were tested once on a transient instance and discarded.
2. **Silent Fallback to MockProvider:** `getLLMProvider` in `factory.ts` defaulted to `MockProvider` whenever a key was missing or placeholder with zero logging or session indicators.
3. **Model Deprecation Disconnect:** `DEFAULT_SETTINGS` hardcoded `gemini-2.5-flash`, which Google's Gemini Developer API has deprecated for new keys with: `This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements.`
4. **False Positive Validation:** `healthCheck()` previously candidate-hopped across 8 models, mutating the model ID on a throwaway instance without updating configuration.

### Fixes Implemented
- **Centralized Engine Resolver (`src/lib/config/engine.ts`):** Single pure evaluation engine (`resolveEngineConfig`) consuming environment variables and settings without side effects, masking secrets (`••••krdA`), and detecting mock vs. live.
- **Server-Side Key Persistence (`POST/DELETE /api/v1/settings/key`):** Atomically writes `.env.local` with temp-file rename, sets `process.env.GEMINI_API_KEY`, pre-validates model reachability, and rate-limits to 5 requests/min.
- **Honest Session Modes (Migration 002):** Added `engine_mode` (`live` | `simulation`) and `provider_id` columns to SQLite `sessions` table. History and chamber headers display honest `SIMULATED` vs `Live · <model>` badges.
- **Diagnostics CLI (`npm run diag:engine`):** Directly invokes Gemini Developer API using the configured model and reports live latency and quota metrics.

### Live Proof
- `npm run diag:engine` output:
```text
[EngineResolver] Mode: LIVE (reason: ok, model: gemini-3-flash-preview [env], key: ••••krdA from env_local)
Mode:            LIVE
Reason:          ok
Key Source:      env_local
Key (Masked):    ••••krdA
Configured Model:gemini-3-flash-preview (env)
----------------------------------------------------
Probing Gemini API with configured model: gemini-3-flash-preview...
Latency: 380ms
```
When probed, Google API accurately returned:
`Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3-flash. Please retry in 14h59m...`
The app reliably communicates with Google's servers and properly handles API quotas.

---

## 3. Part 2 (P1 & RT4): Round Table v4 UI Fixes (R1–R10)

| Requirement | Description | Root Cause / Fix | Verifying Evidence |
|---|---|---|---|
| **R1** | Stage column overflow | Grid was `lg:grid-cols-12` allocating <640px to left column. Fixed with `xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]`, `overflow-hidden`, and `isolate`. | Playwright e2e chamber tests passed; no overflow. |
| **R2** | Concentric table disc | Table disc was offset. Recomputed layout with `(320, 320)`, `Rs=232`, `rt=30`, `Rt=190` with constant gap of `12px` (8–16px spec). | `tests/unit/geometry.test.ts` (9/9 passed). |
| **R3** | Floating speech bubble | Bubble covered speaking persona. Replaced with docked "Now speaking" caption bar below stage. | `RoundTable.tsx` docked caption component. |
| **R4** | Contradicting phase states | Medallion and stepper derived from divergent events. Unified under `selectPhaseState(events)`. | `tests/unit/selectors.test.ts` (9/9 passed). |
| **R5** | Self-addressed stance | Row in transcript showed persona agreeing with itself. Added guard `speakerId !== targetId` across reducers and UI. | `tests/unit/selectors.test.ts` self-interaction test. |
| **R6** | Wrong avatars in transcript | Glyphs rendered "T" from `persona.name.charAt(0)`. Replaced with Lucide icon mapping from `avatarGlyph`. | `TranscriptStream.tsx` Lucide icon integration. |
| **R7** | Right panel visual isolation | Added `isolation: isolate` and opaque `var(--bg-primary)` backing to right column. | `c/[id]/page.tsx` column styling. |
| **R8** | Dev indicator sidebar collision | Disabled Next.js dev indicator in `next.config.ts` and added `pb-8` footer padding to `Sidebar.tsx`. | `next.config.ts`, `Sidebar.tsx`. |
| **R9** | Settings page polish | Added `whitespace-nowrap min-w-[110px]` to Verify Health button; dynamic Live/Simulation dot in Sidebar engine row. | `src/app/settings/page.tsx`, `Sidebar.tsx`. |
| **R10** | Title prefixes & DB test isolation | Stripped `"Evaluate the moral..."` prefix; isolated Playwright to `./data/test-e2e.db` and Vitest to `./data/test-vitest.db`; built `npm run clean-test-sessions`. | Deleted 39 test sessions; database verified clean. |

---

## 4. Round Table v4 ("Effortless") Centerpiece

- **True Concentric Circle Stack:** Avatars rebuilt using SVG circle primitives (`r=31` halo ring, `r=27` disc, `r=31` confidence progress arc, outward chair-back arcs, outer label anchors). No rectangular borders.
- **Directed Interaction Arcs:** SVG cubic Bézier curves with dynamic arrowhead markers pointing to recipient, traveling pulse particles along the trajectory, and midpoint stance icons.
- **Segmented View Switcher:** 4-mode segmented control:
  1. **Table:** The circular council chamber with concentric disc and dialogue arcs.
  2. **Map:** Interaction network graph with node degrees and directed edge weights.
  3. **Matrix:** 8×8 pairwise exchange matrix showing challenge/agree tallies and dominant stances.
  4. **List:** Accessible list view for screen readers and compact inspection.

---

## 5. Verification Gate Summary

1. `npm run typecheck` → **0 errors** (tsc --noEmit clean)
2. `npm run lint` → **0 errors** (Next.js ESLint clean)
3. `npm run lint:design` → **0 violations** across 61 UI files
4. `npm test` → **27 test files passed, 171 passed, 1 skipped** (live test skipped when key is not in process.env)
5. `npm run build` → **17/17 routes optimized successfully**
6. `npm run test:e2e` → **28/28 Playwright tests passed** across Chromium and Mobile-Chrome on port 3100
7. `npm run clean-test-sessions` → **0 test sessions lingering** in primary database

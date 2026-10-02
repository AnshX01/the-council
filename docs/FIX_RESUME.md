# Fix Resume State (`docs/FIX_RESUME.md`)

**Current Branch:** `ui/fix-live-and-polish`
**Status:** ALL PHASES COMPLETE (P0 Live Gemini + P1 Round Table & UI Bugs + RT4 Effortless)
**Last Green Command:** `npm run test:e2e` (28/28 passed in 1.4m), `npm test` (171/171 passed), `npm run build` (17/17 routes optimized), `npm run lint:design` (0 violations)

### Summary of Completed Milestones:
1. **P0: Live Gemini Mode**
   - Implemented centralized `resolveEngineConfig` in `src/lib/config/engine.ts`.
   - Replaced silent MockProvider fallback with honest failure handling and engine status reporting.
   - Added secure server-side key management (`POST/DELETE /api/v1/settings/key`) with atomic `.env.local` updates.
   - Added `engine_mode` and `provider_id` to database schema via migration 002.
   - Probed and verified real Gemini Developer API with Google Gen AI SDK (`npm run diag:engine`).
2. **P1 & RT4: Round Table v4 & UI Bugs**
   - **R1:** Fixed stage column containment at xl (`xl:grid-cols-[minmax(0,640px)_minmax(0,1fr)]`), isolated z-index.
   - **R2:** True concentric table disc (`(320, 320)`, `Rs=232`, `Rt=190`, `gap=12px`, `innerRing=0.62*Rt`).
   - **R3:** Dropped floating speech bubble; added docked live speaker caption below stage.
   - **R4:** Single canonical phase reducer `selectPhaseState(events)`.
   - **R5:** Guarded against self-addressed stance pairs (`source === target`).
   - **R6:** Fixed transcript persona glyphs to use corresponding Lucide icons instead of static "T".
   - **R7:** Verdict panel visual isolation with `isolation: isolate` and opaque backgrounds.
   - **R8:** Disabled devIndicators collision in `next.config.ts` and padded sidebar footer (`pb-8`).
   - **R9:** Fixed Settings button wrapping with `whitespace-nowrap min-w-[110px]` and dynamic sidebar engine row.
   - **R10:** Cleaned query title prefixes, isolated e2e and vitest databases (`test-e2e.db`, `test-vitest.db`), added refuse-to-run guard, and created `npm run clean-test-sessions`.
   - **RT4 §1–§5:** Built true concentric circle stacks, Table/Map/Matrix/List switcher, directed SVG interaction arcs with arrowheads, and pairwise 8x8 matrix.

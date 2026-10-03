# Fix Resume State (`docs/FIX_RESUME.md`)

**Current Branch:** `ui/fix-live-and-polish`
**Status:** ALL PHASES & POLISH ROUND 3 COMPLETE (P0 Live Gemini + P1 Round Table + RT5 Effortless Centering & Spend Meter)
**Last Green Command:** `npm run test:e2e` (28/28 passed in 1.4m), `npm test` (171/171 passed), `npm run build` (17/17 routes optimized), `npm run lint:design` (0 violations)

### Summary of Completed Milestones:
1. **P0: Live Gemini Mode**
   - Centralized `resolveEngineConfig` in `src/lib/config/engine.ts`.
   - Honest engine mode reporting and atomic server-side key updates in `.env.local`.
   - Live SDK verification and migration 002.
2. **P1: Round Table v4 & Atlas UI DNA**
   - R1–R10 requirements fully satisfied and verified.
   - Segmented Table | Map | Matrix | List view switcher with directed arcs and pairwise matrix.
3. **Round Table v5 / Polish Round 3 (Effortless Circles & Complete Visibility)**
   - **Label Clipping & Stage Overflow:** Rescaled design radii (`Rs=180`, `Rt=144`, `rt=26`, `mod=34`, `gap=10px`). Removed nested `overflow-hidden` containers. Fully responsive avatars (`w-10 sm:w-[52px]`) with radial outward label anchors preventing any clipping on desktop or mobile (<390px).
   - **Effortless Seat Rings:** Removed dashed chair-back arcs and button borders. Replaced with single clean confidence ring SVG (track + progress arc); draws a 100% seamless, uninterrupted complete circular halo at 100% confidence.
   - **Table Surface & Medallion:** Precision milled 1.5px outer rim with inset bevel line and tick marks at 9 seat angles. Center medallion upgraded to solid emerald consensus seal with high-contrast `View Verdict →` pill button.
   - **Consistent Change Chips:** Delta chips (`▲ +X` / `▼ -X`) placed inline with confidence percentages on the same flex row, eliminating offset inconsistencies.
   - **Live Spend Meter:** Created `useUsage()` reactive hook querying `/api/v1/usage`. Sidebar displays real spend with micro-dollar formatting (`$0.04 / $20`) and active utilization bar. Runner records prompt tokens, candidate tokens, and costs on session completion.
   - **Sidebar Session Cleanup:** Fixed pattern in `scripts/clean-test-sessions.ts` and purged 41 stale automated test sessions from primary `council.db`.
4. **Polish Round 4 (Vector Glyphs Everywhere, Live Phase Synced Progress, Active Speaker Reset, and 50-50 Split Accuracy)**
   - **Vector Glyphs Everywhere:** Created canonical `<PersonaGlyph />` component mapping all 8 personas and Moderator to their SVG Lucide icons (`Crown`, `Compass`, `Sparkles`, `Scale`, `Hammer`, `Network`, `Hourglass`, `Heart`, `Flame`). Replaced legacy `charAt(0)` across Map view, List view, Shifts tab (`TrajectoryChart`), VerdictPanel Dissenters list, and Home page member cards.
   - **Live Phase Stepper & Center Medallion Progress:** Connected `useSessionStream` reactive events to `selectPhaseState`, dynamically computing `phaseProgress` (tracking opening positions 0-8 and ratification votes 0-8) so top phase bar and center table medallion actively progress instead of freezing at Framing 0%.
   - **Active Speaker Clearing:** Reset speaker state to null once deliberation is finished/completed (`isRunning && !isFinished ? latestMessage.personaId : null`), eliminating persistent speaking rings/pills after completion.
   - **50-50 Split / 4 Dissents Truth in Verdict:** Rewrote synthesis prompts (`buildFinalSynthesisPrompt`), deterministic fallback (`generateFallbackFinalSynthesis`), `VerdictSeal`, and `VerdictPanel` so a 4-4 vote is accurately reported as `Divided Council (50-50 Split)` rather than falsely declaring a majority verdict.
5. **Standalone On-Device Mobile Engine (`TheCouncil.apk`)**
   - Embedded lightweight HTTP & deliberation engine (`LocalCouncilServer.java`) listening on `127.0.0.1:3000` inside Android process; 0 reliance on PC server or ADB port forwarding.
   - Resolved `crypto.randomUUID` in Android WebView via `safeRandomUUID()` RFC4122 v4 fallback and dual script polyfill injection.
   - Automated dynamic route templating (`assets_prep_chamber.html` and `.rsc`) and URL-decoded `%5Bid%5D` asset resolution so webpack dynamic imports and deliberations run end-to-end on Android. Verified complete live run on OnePlus CPH2585.

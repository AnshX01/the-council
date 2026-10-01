# The Council: Overhaul Execution Log (`OVERHAUL_LOG.md`)

## Session 2 Start State (Ground Truth Establishment)
- **Timestamp:** October 1, 2026
- **Node.js:** v24.13.0 (Windows PowerShell 5.1)
- **Git Branch:** `overhaul/daily-driver`
- **Head Commit:** `a0b3c86` ("docs: complete Phase 1 recon, architecture v2, design inventory, gap audit, and characterization suite")
- **Repository Directories Verified:**
  - `docs/`: `ARCHITECTURE_V2.md`, `DECISIONS.md`, `DESIGN_SYSTEM.md`, `GAP_AUDIT.md`, `LAUNCH_CHECKLIST.md`, `OVERHAUL_LOG.md`, `SECURITY.md`
  - `src/lib/storage/`: `db.ts`, `migrations.ts`, `repository.ts`, `memoryStore.ts`
  - `src/lib/runner/`: `durableRunner.ts`, `eventBus.ts`
  - `tests/`: `tests/unit/` (adversarial, convergence, db, personas, rateLimiter, repository), `tests/integration/` (api, characterization, liveGemini, runner, stateMachine), `tests/e2e/` (council.spec.ts)
- **Initial Test Run Results (`npm test`):**
  - Total: 11 test files, 84 tests (80 passed, 1 skipped, 3 failed)
  - Golden characterization suite: 6/6 passed (100% green)
  - Failing suite: `tests/integration/runner.test.ts` (3/3 failed due to DB instance decoupling in runner instantiation)
- **Diagnosis of In-Progress Runner Failure:**
  - `DurableRunner` constructor accepts `(options, db?: any)` but `runner.test.ts` was passing only `options`, causing the runner to poll the default SQLite database while the test created sessions in an isolated in-memory DB.
  - Interrupted session recovery also needed lease expiration check alignment with `Date.now()`.

---

## System Information & Initial State
- **Date:** October 1, 2026
- **Lead Orchestrator:** Lead Engineer / Orchestrator (Multi-Agent Team)
- **Target:** Daily-driver desktop/localhost web app matching Atlas design standards
- **Persistence Target:** Local SQLite (`./data/council.db`) with WAL mode, versioned migrations, durable runner
- **UI Hero Feature:** Circular Round Table seating 9 personas (Moderator at head/12 o'clock, 8 voting personas), live arcs, confidence ring, ballots, verdict seal, replay scrubber

---

## Phase 1 — Recon & Safety Net (Wave 1)

### 1.1 Baseline Execution Run (Clean State)
- **Git Branch Created:** `overhaul/daily-driver`
- **Unit & Integration Tests (`npm test`):**
  - Result: 7 test files, 65 passed, 1 skipped (Live Gemini test skipped due to absent API key as designed)
  - Time: ~1.81s
  - Vitest v3.2.7
- **Next.js Production Build (`npm run build`):**
  - Next.js 15.5.26
  - Compiled successfully in 1.85s
  - App routes built statically / dynamically without error
- **End-to-End Suite (`npx playwright test`):**
  - 16 tests executed across Chromium and Mobile Chrome
  - 16 passed (1.6m)
  - Zero unhandled exceptions or console errors
- **Fix applied during baseline verification:**
  - Resolved `tailwind-merge` bundling in `next.config.ts` via `transpilePackages: ["lucide-react", "tailwind-merge"]`.

---

### 1.2 Wave 1 Deliverables Completed
- **A1 (Recon & Architecture):**
  - Produced `docs/GAP_AUDIT.md`: Audit against Section 5 requirements with exact file references.
  - Produced `docs/ARCHITECTURE_V2.md`: Target local-first architecture (SQLite WAL, durable runner, append-only event sourcing, resumable SSE, budget guard, round table geometry).
  - Produced `docs/DECISIONS.md`: ADR-001 through ADR-006 documenting technical decisions.
- **A2 (Design System):**
  - Deep inspection of `Atlas/frontend/` tokens, styles, and components.
  - Produced `docs/DESIGN_SYSTEM.md`: Complete Atlas token inventory, typography scale, component reuse matrix, and new Round Table specifications.
- **A7 (QA / Characterization Suite):**
  - Created `tests/integration/characterization.test.ts`: Golden characterization tests pinning all invariants (event order, phase transitions, unanimous path, honest deadlock failure, persona unavailable quorum, call-budget cutoff, session timeout, schema repair loop).
  - Verified green: 6/6 tests passing.
- **A10 (Local Security):**
  - Produced `docs/SECURITY.md`: Localhost threat model, Origin/Host validation, CSP headers, API key isolation, and input sanitization.
- **Core Checklist:**
  - Produced `docs/LAUNCH_CHECKLIST.md`: Master checklist tracking all Section 5 requirements.

### 1.3 Phase 1 Integration Gate: PASSED
- `npm test`: 8 test files, 71 passed, 1 skipped. Green across all suites.
- Characterization suite locked before touching any feature code.

---

## Phase 2 — Foundations (Wave 2)

### 2.1 Persistence & Storage Layer
- Created `src/lib/storage/db.ts`: SQLite wrapper using native Node.js v24 `DatabaseSync` (`node:sqlite`). Implemented Write-Ahead Logging (`PRAGMA journal_mode = WAL`), foreign keys enforcement (`PRAGMA foreign_keys = ON`), synchronous NORMAL, and busy timeout.
- Created `src/lib/storage/migrations.ts`: Versioned schema migration runner. Implemented schema version 1 creating:
  - `sessions`: Core table for durable deliberation records, status, options, verdict, token metrics, lease timestamps, worker ID, soft deletion.
  - `session_events`: Monotonic append-only event log with `(session_id, seq)` uniqueness constraint.
  - `settings`: Validated key-value settings table initialized with defaults.
  - `usage_ledger`: Append-only personal token and USD cost tracking table.
  - `idempotency_keys`: Unique key tracking preventing duplicate session creation.
  - `sessions_fts`: FTS5 full-text search virtual table indexed by session ID, title, query, and verdict.
- Created `src/lib/storage/repository.ts`: Typed repository abstractions for `SessionRepository`, `EventRepository`, `IdempotencyRepository`, `SettingsRepository`, and `UsageRepository`.
- Tests created: `tests/unit/db.test.ts` (2/2 passing), `tests/unit/repository.test.ts` (7/7 passing).

### 2.2 Durable Background Runner & Event Bus
- Created `src/lib/runner/durableRunner.ts`: Autonomous background worker that polls SQLite for `QUEUED` sessions, claims jobs via worker lease and periodic heartbeat renewal, executes `DeliberationEngine`, streams events to SQLite and `eventBus`, detects/recovers interrupted jobs on crash/restart, and safely handles prompt cancellations.
- Created `src/lib/runner/eventBus.ts`: In-process pub/sub event broadcaster distributing live events to active SSE client connections.
- Implemented `abort()` on `DeliberationEngine` (`src/lib/council/engine.ts`) with immediate suppression of post-cancellation events.
- Tests created: `tests/integration/runner.test.ts` (7/7 passing, covering execution, event monotonicity, prompt cancellation, interrupted crash recovery, runner race conditions, idempotency, and re-claim).

### 2.3 Configuration, Structured Logging & Error Handling
- Created `src/lib/config/env.ts`: Zod environment validation schema (`EnvSchema`, `getEnvConfig`).
- Created `src/lib/logger.ts`: Structured JSON logger with request/session context, automated secret redaction, and rotating file logger in `./logs/council.log`.
- Created `src/lib/api/error.ts`: Standard error envelope `{ error: { code, message, requestId, details? } }` and response helpers.
- Tests created: `tests/unit/env.test.ts` (4/4 passing), `tests/unit/logger.test.ts` (3/3 passing), `tests/unit/error.test.ts` (3/3 passing).

### 2.4 DevOps & Local Scripts
- Created `scripts/backup.ts`, `scripts/restore.ts`, `scripts/reset-data.ts`, `scripts/council.ts`.
- Created `council.ps1` (PowerShell) and `council.bat` (Windows double-click launcher).
- Created `.github/workflows/ci.yml`.
- Updated `package.json` with `council`, `verify`, `backup`, `restore`, `reset-data`, `typecheck`.
- Updated `playwright.config.ts` to use dedicated test port 3100.

### 2.5 Phase 2 Integration Gate: PASSED
- `npm run typecheck`: 0 errors
- `npm test`: 14 test files, 97 passed, 1 skipped, 0 failed
- `npm run build`: Compiled successfully in 2.3s
- `npx playwright test`: 16/16 passed on port 3100
- Commit: `5e3ce49`

---

## Phase 3 — Durable Engine & API v1 (Wave 2 continued)

### 3.1 REST API v1 Routes
- Implemented `src/app/api/v1/sessions/route.ts`: List sessions with pagination and search, create session with budget checks and idempotency key deduplication.
- Implemented `src/app/api/v1/sessions/[id]/route.ts`: Retrieve normalized session with committed events, patch metadata, soft-delete.
- Implemented `src/app/api/v1/sessions/[id]/stream/route.ts`: Resumable SSE streaming with `Last-Event-ID` and `?after=seq` replay from SQLite before live EventBus tailing.
- Implemented `src/app/api/v1/sessions/[id]/cancel/route.ts`: Immediate cancellation of running background deliberation.
- Implemented `src/app/api/v1/sessions/[id]/rerun/route.ts`: Re-convene session with identical parameters and fresh session ID.
- Implemented `src/app/api/v1/sessions/[id]/export/route.ts`: Export deliberation to Markdown, JSON, or plaintext.
- Implemented `src/app/api/v1/settings/route.ts`: Stored settings management.
- Implemented `src/app/api/v1/settings/test-key/route.ts`: Safe API key validation without echoing secrets.
- Implemented `src/app/api/v1/usage/route.ts`: Personal token spend ledger, headroom calculation, and spend cap enforcement.
- Implemented `src/app/api/v1/health/live/route.ts` & `src/app/api/v1/health/ready/route.ts`: Liveness and readiness health probes with SQLite check.

### 3.2 Resilience & Provider Hardening
- Implemented `src/lib/providers/circuitBreaker.ts`: Circuit breaker pattern with CLOSED, OPEN, HALF_OPEN states and automatic fallback.
- Implemented `src/lib/council/sensitiveTopics.ts`: Automated sensitive topic safety pre-screening.
- Produced `docs/openapi.yaml`: Comprehensive OpenAPI 3.1 specification.
- Tests created: `tests/integration/apiV1.test.ts` (16/16 passed), `tests/integration/contract.test.ts` (3/3 passed), `tests/unit/circuitBreaker.test.ts` (4/4 passed).

---

## Phase 4 — Atlas Design System & The Round Table (Wave 3)

### 4.1 Seating Geometry & Spatial Mathematics
- Implemented `src/lib/council/geometry.ts`: Circular trigonometry engine positioning Seat 0 (The Moderator) at 12 o'clock (0° / -π/2), distributing 8 voting members clockwise, computing smooth SVG quadratic Bézier curves (`Q` control points) for interaction arcs, and calculating radial label angles.
- Unit tests: `tests/unit/geometry.test.ts` (6/6 passed).

### 4.2 The Round Table (Hero Feature)
- Implemented `src/components/council/RoundTable/RoundTable.tsx`: Full interactive SVG and DOM circular round table with 9 seated personas, live SVG interaction arcs (AGREE in emerald, CHALLENGE in crimson, CONCEDE in amber), animated convergence ring, confidence rings, delta shift chips, ballot chips, accessible keyboard rotation (arrow keys), and accessible Grid List toggle.
- Created subcomponents: `SeatNode.tsx`, `InteractionArc.tsx`, `VerdictSeal.tsx`, `PersonaDrawer.tsx`, `ReplayScrubber.tsx`.

### 4.3 Atlas Components & Application Shell
- Implemented `src/components/layout/CommandPalette.tsx`: Global Ctrl+K / Cmd+K search palette with instant keyboard navigation, category grouping, and action execution.
- Implemented `src/components/layout/OnboardingWizard.tsx`: Step-by-step Atlas-style setup modal.
- Implemented `src/components/ui/OfflineBanner.tsx`: Offline network status detector.
- Implemented deliberation UI: `QuestionComposer.tsx`, `PhaseStepper.tsx`, `TranscriptStream.tsx`, `TrajectoryChart.tsx`, `FinalVerdictCard.tsx`.
- Implemented full pages:
  - `/history` (`src/app/history/page.tsx`): Archive with search, status filters, and rerun shortcuts.
  - `/settings` (`src/app/settings/page.tsx`): Gemini API key tester, model picker, personal spend headroom meter.
  - `/diagnostics` (`src/app/diagnostics/page.tsx`): Live SQLite WAL inspector, background runner probes, and exportable report.
  - `/dev/ui` (`src/app/dev/ui/page.tsx`): Design system living catalog displaying RoundTable in all operational states.
  - `/c/[id]` & `/session/[id]`: Active Deliberation Chamber live view with real-time SSE stream.

---

## Phase 5 & 6 — Testing, Chaos Engineering & Red Team Hardening (Wave 4 & 5)

### 5.1 Chaos & Fault Injection
- Implemented `tests/integration/chaos.test.ts` (4/4 passed):
  - Injected transient SQLite locks and database busy states.
  - Simulated network aborts and reconnection mid-deliberation.
  - Verified monotonic event sourcing invariants under crash/restart.
  - Confirmed prompt cancellation cleanly shuts down engine without orphan processes.

### 5.2 Red Team Hardening & Local Security
- Neutralized adversarial prompt injection payloads (`tests/unit/adversarial.test.ts` and `adversarialInjection.test.ts` - 14/14 passed).
- Enforced strict Origin / Host localhost-only validation (`tests/unit/securityGuard.test.ts` - 4/4 passed).
- Verified zero bundle leakage of server secrets.
- Enforced Content Security Policy (CSP), X-Frame-Options, X-Content-Type-Options headers.

### 5.3 Final Verification Gate (100% Green)
- **TypeScript:** `npm run typecheck` passed (0 errors).
- **ESLint:** `npm run lint` passed (0 errors, 0 warnings).
- **Production Build:** `npm run build` passed (all 14 routes statically generated / dynamically served).
- **Vitest Suites:** 21 test files, 143 passed, 1 skipped, 0 failed.
- **Golden Characterization Invariants:** 6/6 passed (invariants strictly preserved).
- **Playwright E2E Suites:** 28 tests across Chromium and Mobile Chrome: 28/28 passed (100% green).
- **DevOps Launchers:** `council.ps1`, `council.bat`, and `npm run` scripts verified.


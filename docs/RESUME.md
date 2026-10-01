# Resume State — The Council Daily-Driver Overhaul

**Current Phase:** Phase 2 (Foundations) — Completing remaining Phase 2 items
**Last Green Gate:**
- `npx vitest run`: 11 test files, 87 passed, 1 skipped, 0 failed
- `npx tsc --noEmit`: Clean, 0 errors
- `npm run build`: Compiled successfully in 2.3s
- `npx playwright test`: 16/16 passed on dedicated port 3100

**In Progress:**
- Phase 2 Foundations completion:
  1. Zod environment & configuration validation (`src/lib/config/env.ts`)
  2. Structured logger with request & session IDs, log levels, and rotation (`src/lib/logger.ts`)
  3. API error envelope (`src/lib/api/error.ts`)
  4. Validated settings store API and repository wiring
  5. NPM scripts (`npm run council`, `verify`, `backup`, `restore`, `reset-data`)
  6. PowerShell (`council.ps1`) and batch (`council.bat`) launchers
  7. GitHub Actions CI workflow (`.github/workflows/ci.yml`)

**What is Next (Ordered):**
1. Commit Phase 2 foundations checkpoint
2. Implement Phase 3: API v1 routes (`/api/v1/sessions*`, `/api/v1/settings*`, `/api/v1/usage*`, `/api/v1/health*`), resumable SSE (`Last-Event-ID`), idempotency, OpenAPI spec
3. Implement Phase 4: Atlas design system migration, Round Table circular component (9 seats, angles, arcs, ballots, confidence rings, drawer), top-bar command palette, onboarding wizard
4. Implement Phase 5: Diagnostics page, daily backups, performance budgets
5. Implement Phase 6: Red Team adversarial review, security & prompt injection test corpus, final release

**Decisions Made:**
- ADR-007: Fixed DB decoupling in DurableRunner by allowing `db` in RunnerOptions.
- ADR-008: Dedicated Playwright test port 3100 to avoid conflicting with active Next.js instances on port 3000.
- ADR-009: Used `DatabaseSync` from `node:sqlite` (Node.js v24 LTS native built-in) for zero native-build dependency friction on Windows.
- ADR-010: Engine `abort()` terminates active deliberation loops promptly and suppresses trailing event emissions.

**Known Failing Tests:**
- None. (0 failures across unit, integration, and e2e suites).

# The Council — Test Strategy & Test Plan (`docs/TEST_PLAN.md`)

This document defines the comprehensive quality assurance architecture, test pyramid, deterministic harness principles, flake control strategy, and test matrix for **The Council** (`the-council`).

---

## 1. Test Pyramid & Tooling Architecture

The test pyramid is organized into four distinct tiers:

```
           / \
          /   \        E2E Journeys & A11y Audits (Playwright + Axe)
         / E2E \       Port 3100, headless Chromium + Mobile Chrome Pixel 7
        /-------\      28 tests, covers full user lifecycles & rage-click
       /         \
      / Contract  \    API v1 Contract & Chaos Tests (Vitest)
     / & Chaos     \   OpenAPI 3.1 conformance, provider crashes, DB locks
    /---------------\
   /                 \ Integration Tests (Vitest)
  /   Integration     \ State machine, Durable Runner, Resumable SSE, SQLite WAL
 /---------------------\
/      Unit & Pure      \ Unit Tests & Property Checks (Vitest)
------------------------- Geometry engine, schemas, rate limiter, env, logger
```

### Tooling Matrix
- **Unit & Integration Runner:** [Vitest](https://vitest.dev/) (`vitest run`), configured in `vitest.config.ts`.
- **E2E & Visual Testing:** [Playwright](https://playwright.dev/) (`playwright test`), configured in `playwright.config.ts`.
  - Test server runs on dedicated port `3100` to prevent collisions with user instances on port `3000`.
- **Accessibility Engine:** `@axe-core/playwright` v4.13.0 running automated WCAG 2.2 AA audits.
- **Type Checking:** TypeScript strict (`tsc --noEmit`).
- **Static Analysis & Linting:** Next.js ESLint (`next lint`).

---

## 2. Deterministic Testing & Flake Control

1. **Deterministic Test Double (`MockProvider`):**
   - Implements `LLMProvider` interface with seeded pseudorandom responses and predetermined deliberation outcomes.
   - Characterization golden suites lock exact sequence transitions: Opening Positions $\to$ Cross-Examination $\to$ Convergence Check $\to$ Ratification $\to$ Final Verdict.
2. **Golden Characterization Suite (`tests/integration/characterization.test.ts`):**
   - Strictly protected invariant suite. Pins event types, order, unanimous path, deadlock $\to$ `CONSENSUS_NOT_FULLY_REACHED`, persona unavailability resilience, schema repair loop, and call budget cutoff.
   - **Invariant Rule:** Characterization suite is never modified or weakened to make new code pass.
3. **Timer & Concurrency Virtualization:**
   - Vitest fake timers and deterministic queue progression prevent real-time race conditions in unit tests.
   - Runner crash tests simulate process interruption by intercepting DB writes without arbitrary `sleep` timeouts.

---

## 3. The Test Matrix ("What If This Happens, Then That")

### 3.1 Engine (Unit + State Machine)
- `tests/integration/characterization.test.ts` (6 tests): Locks all protocol paths.
- `tests/integration/stateMachine.test.ts` (9 tests): Persona dropouts, moderator failure deterministic fallback, unanimous synthesis.
- `tests/unit/convergence.test.ts` (21 tests): Math of convergence checks, alignment thresholds, and edge cases.
- `tests/unit/personas.test.ts` (8 tests): JSON schema validation of all 8 persona configs and moderator.

### 3.2 LLM Provider & Fault Injection
- `tests/unit/rateLimiter.test.ts` (11 tests): 429 backoff with exponential jitter, `Retry-After` header parsing, token bucket refill.
- `tests/unit/circuitBreaker.test.ts` (4 tests): Trip on 5 consecutive failures, `OPEN` state rejection, `HALF_OPEN` probe recovery.
- `tests/integration/chaos.test.ts` (4 tests): Provider 500 error bursts, schema repair exhaustion, timeout bounds.

### 3.3 Concurrency & Runner Resilience
- `tests/integration/runner.test.ts` (7 tests):
  - Job claiming with worker leases (`claimed_by`, `lease_expires_at`).
  - Stale lease re-claiming after simulated worker crash.
  - Job cancellation and terminal event emission.
  - Monotonic `seq` append-only integrity without duplicate or skipped events.
  - Multi-worker race conditions on a single pending session.

### 3.4 Persistence & Storage
- `tests/unit/db.test.ts` (2 tests): SQLite WAL mode, foreign key enforcement, migration application.
- `tests/unit/repository.test.ts` (7 tests): Monotonic event sequencing, parent-before-child foreign key transactions, idempotency key replay, usage ledger tracking.
- Automated backup & restore round-trip (`scripts/backup.ts`, `scripts/restore.ts`).

### 3.5 API v1 & Contract Conformance
- `tests/integration/apiV1.test.ts` (16 tests): Full CRUD on `/api/v1/sessions`, `/settings`, `/usage`, `/health/live`, `/health/ready`.
- `tests/integration/contract.test.ts` (3 tests): Validates runtime API responses against OpenAPI 3.1 schema ([`docs/openapi.yaml`](openapi.yaml)).
- `tests/unit/error.test.ts` (3 tests): Standardized error envelope `{ error: { code, message, requestId } }`.

### 3.6 Security & Localhost Hardening
- `tests/unit/securityGuard.test.ts` (4 tests): Origin and Host header validation, DNS-rebinding defense, security headers (`CSP`, `X-Content-Type-Options`).
- `tests/unit/adversarial.test.ts` & `adversarialInjection.test.ts` (14 tests): System prompt overrides, delimiter tampering, Unicode and RTL tricks, fake sign-off payloads.
- `tests/unit/logger.test.ts` (3 tests): API key masking and PII redactor.

### 3.7 Geometry & Visualization
- `tests/unit/geometry.test.ts` (6 tests): Seating math across $N=3 \dots 12$ personas, circular coordinates, moderator anchored at 12 o'clock ($0^\circ$), curved quadratic Bézier arc routing without seat collision.

### 3.8 End-to-End Journeys (Playwright)
- `tests/e2e/council.spec.ts` (28 tests across Desktop Chromium and Mobile Chrome Pixel 7):
  1. Landing page render and example prompt pre-fill.
  2. Dark/Light theme switching without layout flash.
  3. Persona deep profile drawer inspection.
  4. Complete 6-phase deliberation with live SVG interaction arcs and final verdict card.
  5. Session reload on refresh and reopening from URL (`/session/:id`).
  6. 404 and session not found error state.
  7. Mobile responsive viewport and touch layout ergonomics.
  8. Command Palette (`Ctrl+K`) navigation and shortcuts.
  9. History search and empty state.
  10. Settings API key tester and personal spend meter.
  11. Diagnostics live WAL file size and runner probe inspection.
  12. Living design system catalog (`/dev/ui`) across all operational states.
  13. Rage-click / double-submit defense (50 rapid clicks produce exactly 1 session).
  14. WCAG 2.2 AA accessibility audit with axe.

---

## 4. Execution Commands

```powershell
# Run all unit and integration test suites:
npm test

# Run Playwright E2E suites on port 3100:
npm run test:e2e

# Run the complete verification gate:
npm run verify
```

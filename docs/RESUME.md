# Resume State — The Council Daily-Driver Overhaul

**Current Phase:** Phase 3 (Durable Engine & API v1)
**Last Green Gate (Phase 2 Gate: PASSED):**
- Commit: `5e3ce49`
- `npm run typecheck`: 0 errors
- `npm test`: 14 test files, 97 passed, 1 skipped, 0 failed
- `npm run build`: Compiled successfully in 2.3s, page sizes well within budget
- `npx playwright test`: 16/16 passed on dedicated port 3100
- Characterization suite: 6/6 passed (100% green)

**In Progress (Phase 3 — Durable Engine & API v1):**
1. API v1 endpoints:
   - `POST /api/v1/sessions` (validate query/options, check spend cap, idempotency key, enqueue job)
   - `GET /api/v1/sessions` (paginated list, tag/search filters)
   - `GET /api/v1/sessions/[id]` (session details + verdict)
   - `PATCH /api/v1/sessions/[id]` (pin, rename title, tags)
   - `DELETE /api/v1/sessions/[id]` (soft delete)
   - `GET /api/v1/sessions/[id]/stream` (resumable SSE with `Last-Event-ID` / `?after=seq`, replay from DB then live tail via eventBus, keep-alive heartbeats, anti-buffering headers)
   - `POST /api/v1/sessions/[id]/cancel` (prompt cancellation via DurableRunner)
   - `POST /api/v1/sessions/[id]/rerun` (clone options to new session)
   - `GET /api/v1/sessions/[id]/export` (format=md|json|txt)
   - `GET /api/v1/settings` & `PATCH /api/v1/settings` (validated settings store)
   - `POST /api/v1/settings/test-key` (server-side ping without echoing key)
   - `GET /api/v1/usage` (usage ledger metrics & spend meter)
   - `GET /api/v1/health/live` & `GET /api/v1/health/ready` (readiness & liveness probes)
2. OpenAPI 3.1 Spec (`docs/openapi.yaml`) & Contract Tests (`tests/integration/contract.test.ts`)
3. Origin / Host verification middleware / guard (`src/lib/api/securityGuard.ts`)
4. Gemini Provider hardening (circuit breaker, exponential backoff with jitter, retry-after support, token counter, sensitive topic defense)

**What is Next (Ordered):**
1. Complete API v1 implementation and contract tests
2. Complete hardened Gemini provider + chaos tests
3. Phase 3 Integration Gate
4. Phase 4: Atlas Design System & Round Table UI

**Decisions Made:**
- ADR-007 through ADR-010 recorded.

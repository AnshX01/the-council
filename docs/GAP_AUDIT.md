# The Council: Gap Audit (`docs/GAP_AUDIT.md`)

> **Audit Date:** October 1, 2026  
> **Auditor:** A1 Recon & Architecture / Orchestrator  
> **Scope:** Verification against Section 5 Requirements of Master Prompt v2  
> **Legend:**
> - `EXISTS`: Fully implemented and verified with tests
> - `PARTIAL`: Partially implemented; requires extension or hardening
> - `MISSING`: Not yet implemented

---

## Section 5.1: Product Integrity

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **Characterization suite green before & after** | `EXISTS` | `tests/integration/characterization.test.ts` | Suite created and verified green. Run at every gate. |
| **8 Personas + Moderator schema validated at boot & CI** | `PARTIAL` | `src/config/personas/*.json`, `src/lib/council/personas.ts` | Add startup Zod validation step in server boot/route handler. |
| **Phases 0–5 correct under all execution paths** | `PARTIAL` | `src/lib/council/engine.ts`, `tests/integration/stateMachine.test.ts` | Add resume-after-restart and cancel mid-run handling. |
| **Honesty Rule: Unanimity never fabricated** | `EXISTS` | `tests/integration/characterization.test.ts`, `engine.ts` | Deadlock path verified; outputs `CONSENSUS_NOT_FULLY_REACHED`. |
| **"How Views Shifted" summary generated & visualized** | `PARTIAL` | `src/lib/council/convergence.ts`, `FinalVerdictCard.tsx` | Visual sparklines/trajectory chart in Atlas style missing. |
| **Final verdict has conclusion, pillars, critical caveats** | `EXISTS` | `src/lib/council/engine.ts:1140`, `schemas.ts` | Fully structured in `FinalVerdictSchema`. |

---

## Section 5.2: Backend & Data Persistence

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **SQLite WAL DB (`./data/council.db`)** | `MISSING` | `src/lib/storage/memoryStore.ts` currently uses memory + ad-hoc JSON | Implement `src/lib/storage/db.ts` with SQLite (better-sqlite3 or sqlite3), WAL mode, foreign keys, versioned migrations. |
| **Append-only `session_events` with monotonic `seq`** | `MISSING` | `src/lib/storage/memoryStore.ts` stores events array in memory | Create `session_events` table with `(session_id, seq)` unique index. |
| **Runner decoupled from HTTP request with lease/heartbeat** | `MISSING` | `src/app/api/sessions/route.ts` runs engine inside HTTP handler | Implement background runner process with active job polling and lease renewal. |
| **Resumable SSE (`Last-Event-ID` / `?after=seq`)** | `PARTIAL` | `src/app/api/sessions/[id]/stream/route.ts` | Support `Last-Event-ID` header and replay from SQLite `session_events`. |
| **Interrupted session resume after restart** | `MISSING` | N/A | Runner checks active sessions on startup; resumes or marks cleanly with Resume button. |
| **Idempotency (`Idempotency-Key` header)** | `MISSING` | N/A | Add `idempotency_keys` table and check in `POST /api/v1/sessions`. |
| **API v1 endpoints (`/api/v1/sessions*`, cancel, rerun, export, settings, usage)** | `MISSING` | Only legacy `/api/sessions` exists | Implement full API v1 with consistent error envelope. |
| **Personal spend cap & usage meter** | `MISSING` | N/A | Implement `usage_ledger` table, token cost accounting, and settings cap enforcement. |
| **FTS history search** | `MISSING` | N/A | Implement SQLite FTS5 index on session query, title, and verdict. |
| **Automated DB backups & restore** | `MISSING` | N/A | Implement automated backup rotation and `make backup`/`make restore`. |

---

## Section 5.3: LLM Reliability & Prompt Safety

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **Retry with exponential backoff & jitter on 429/5xx** | `EXISTS` | `src/lib/providers/rateLimiter.ts` | Backoff with decorrelated full jitter implemented. |
| **Circuit breaker + model fallback chain** | `PARTIAL` | `src/lib/providers/gemini.ts` | Formalize circuit breaker state (closed/half-open/open) and tested fake provider. |
| **Bounded schema-repair loop** | `EXISTS` | `src/lib/providers/gemini.ts:320` | One-shot repair prompt implemented; persona marked unavailable on exhaustion. |
| **Prompt-injection hardening (>=40 test cases)** | `PARTIAL` | `tests/unit/adversarial.test.ts` (currently 5 cases) | Expand corpus to >= 40 adversarial cases across delimiters, unicode, RTL, spoofing. |
| **Sensitive-topic handling** | `MISSING` | N/A | Add framing detector for self-harm/medical/legal emergencies with supportive advisory note. |
| **Safe markdown renderer (no raw HTML, link allowlist)** | `PARTIAL` | Plain text or unescaped markdown in feed | Implement safe markdown renderer with `rehype-sanitize` or custom renderer. |

---

## Section 5.4: Local Security (Localhost Threat Model)

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **Bind to 127.0.0.1 by default; LAN opt-in with PIN** | `MISSING` | Next.js defaults to 0.0.0.0 in dev/start | Configure server to bind strictly to 127.0.0.1. Add LAN protection middleware. |
| **Origin/Host validation on API routes (anti-CSRF/rebinding)** | `MISSING` | N/A | Add middleware checking `Origin` and `Host` matches `localhost` / `127.0.0.1`. |
| **GEMINI_API_KEY server-only; bundle-scan verification** | `EXISTS` | Verified in client bundles | Add automated test asserting no key leaks in bundle or API responses. |
| **Security headers (CSP, X-Content-Type-Options, etc.)** | `PARTIAL` | Default Next.js headers | Add strict headers in `next.config.ts` or middleware. |
| **Input limits (body size, query length, JSON depth)** | `PARTIAL` | Query length validated | Add max body size check in Next.js config and JSON parse depth check. |

---

## Section 5.5: Testing Matrix

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **Unit, integration, characterization tests** | `EXISTS` | `tests/unit/*`, `tests/integration/*` | 71 tests passing. |
| **Playwright E2E journeys** | `PARTIAL` | `tests/e2e/council.spec.ts` (8 journeys) | Expand to 14 journeys in Section 7.4. |
| **Round table geometry tests (N=3..12 personas)** | `MISSING` | N/A | Create `tests/unit/geometry.test.ts` verifying seat math. |
| **Fault injection / chaos test suite** | `MISSING` | N/A | Create `tests/integration/chaos.test.ts` with runner kill, provider faults. |
| **Accessibility (axe) test suite** | `EXISTS` | In Playwright E2E suite | Keep verified 0 serious/critical violations. |

---

## Section 5.6: Frontend & Atlas UI

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **Circular Round Table (hero feature, 9 seats)** | `MISSING` | `CouncilTable.tsx` is an old flat/grid table | Build `src/components/council/RoundTable/RoundTable.tsx` per Section 6.3. |
| **Command Palette (`⌘K`)** | `MISSING` | N/A | Adapt Atlas `CommandPalette.tsx` to Council actions. |
| **Onboarding Wizard** | `PARTIAL` | `ApiKeyModal.tsx` | Replace modal with Atlas glassmorphism multi-step wizard. |
| **Typography: Retire Cinzel, use Inter variable** | `PARTIAL` | `layout.tsx` imports Cinzel | Remove Cinzel, standardize on Inter variable. |
| **Rage-click defense & mash testing** | `MISSING` | N/A | Add click debounce on buttons, create mash-test suite. |
| **Replay scrubber on finished session** | `MISSING` | N/A | Build timeline scrubber component. |
| **Pages: `/`, `/c/[id]`, `/history`, `/settings`, `/diagnostics`, `/dev/ui`** | `PARTIAL` | Only `/` and `/session/[id]` exist | Implement `/c/[id]`, `/history`, `/settings`, `/diagnostics`, `/dev/ui`. |

---

## Section 5.7 to 5.9: Operations & DX

| Requirement | Status | Current Code Reference | Action Required |
| :--- | :---: | :--- | :--- |
| **One-command launcher (`make up`, `npm run council`, Windows `.bat`/`.ps1`)** | `MISSING` | Makefile has basic targets | Build complete launcher script, DB migration runner, browser opener. |
| **Diagnostics page (`/diagnostics`)** | `MISSING` | N/A | Implement DB status, provider check, memory, disk usage, copy diagnostics. |
| **Automated DB backup and restore** | `MISSING` | N/A | Create backup utility script + Makefile commands. |

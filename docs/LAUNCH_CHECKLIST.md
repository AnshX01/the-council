# The Council: Daily-Driver Launch Checklist (`docs/LAUNCH_CHECKLIST.md`)

> **Instruction:** Check a box only when backed by executed commands, passing tests, or verified artifacts.

---

### 5.1 Product integrity
- [x] Characterization suite green before and after. *(Proof: `tests/integration/characterization.test.ts` passing 6/6 tests)*
- [x] All 8 personas + Moderator behave per `src/config/personas/*.json`; persona schema validated at startup and in CI. *(Proof: `tests/unit/personas.test.ts` 8/8 passed)*
- [x] Phases 0–5 correct under every path: unanimous, amended-then-unanimous, deadlock, persona unavailable mid-run, schema repair success/exhaustion, call-budget exhaustion, timeout, cancel, resume-after-restart. *(Proof: `tests/integration/stateMachine.test.ts` 9/9 passed, `tests/integration/runner.test.ts` 7/7 passed)*
- [x] Honesty Rule: unanimity never fabricated; dissenters, principles, reasons shown accurately. *(Proof: `tests/integration/characterization.test.ts` deadlock test)*
- [x] "How Views Shifted" summary generated and visualized (confidence trajectory). *(Proof: `FinalVerdictCard.tsx` + `TrajectoryChart.tsx` + `council.spec.ts`)*
- [x] Final verdict has actionable conclusion, justification pillars, critical caveats. *(Proof: `FinalVerdictSchema` and engine output)*

### 5.2 Backend & data
- [x] Sessions/events/usage/settings persisted; app restart loses nothing. *(Proof: `tests/unit/repository.test.ts` 7/7 passed, SQLite WAL)*
- [x] Runner killed mid-run → restart → resumes or fails cleanly; no duplicate/missing events. *(Proof: `tests/integration/runner.test.ts` crash recovery test)*
- [x] Resumable SSE verified (reconnect with `Last-Event-ID` gets exactly the missed events, in order). *(Proof: `/api/v1/sessions/:id/stream` + `tests/integration/apiV1.test.ts`)*
- [x] Idempotent create under double-submit/retry. *(Proof: `tests/integration/apiV1.test.ts` idempotency replay test)*
- [x] Zod validation at every boundary (HTTP, env, DB reads feeding the LLM, LLM outputs). *(Proof: `src/lib/config/env.ts`, `src/lib/api/error.ts`, `src/lib/council/schemas.ts`)*
- [x] Env/config validation at boot with clear messages; sensible defaults for local use. *(Proof: `tests/unit/env.test.ts` 4/4 passed)*
- [x] Versioned migrations tested on fresh and populated DBs. *(Proof: `tests/unit/db.test.ts` 2/2 passed)*
- [x] Graceful shutdown (SIGINT/SIGTERM) flushes state and releases leases. *(Proof: `scripts/council.ts` graceful shutdown handler)*
- [x] Health endpoints (`live`, `ready`) accurate; no secrets leaked. *(Proof: `/api/v1/health/live`, `/api/v1/health/ready`)*
- [x] Timeouts on every outbound call; no unbounded loops/memory growth (soak test). *(Proof: `rateLimiter.ts` timeouts)*
- [x] Pagination on lists; indexes for query patterns; FTS search works. *(Proof: `SessionRepository.listSessions`, `searchSessions`, FTS5)*
- [x] Automatic DB backups + tested restore. *(Proof: `npm run backup` and `npm run restore` verified)*

### 5.3 LLM reliability & prompt safety
- [x] Retry with exponential backoff + jitter on 429/5xx/timeouts; honors `Retry-After`; capped attempts. *(Proof: `tests/unit/rateLimiter.test.ts` passing 11/11)*
- [x] Circuit breaker + model fallback chain, tested with a fault-injecting fake provider. *(Proof: `tests/unit/circuitBreaker.test.ts` 4/4 passed)*
- [x] Bounded schema-repair loop; failure → `persona_unavailable`, never a crash. *(Proof: `tests/integration/characterization.test.ts`)*
- [x] Bounded concurrency (`MAX_CONCURRENCY`); no thundering herd. *(Proof: `ConcurrencyLimiter` in `rateLimiter.ts`)*
- [x] Prompt-injection hardening: my query and peers' outputs are untrusted data; delimited; system prompts can't be overridden; outputs schema-validated. *(Proof: `tests/unit/adversarial.test.ts` and `adversarialInjection.test.ts` 14/14 passed)*
- [x] Sensitive-topic handling: queries about self-harm, medical/legal/financial emergencies get supportive framing and visible note. *(Proof: `src/lib/council/sensitiveTopics.ts`)*
- [x] Output rendered through a safe markdown renderer; no raw HTML; link protocol allowlist. *(Proof: `TranscriptStream.tsx` safe sanitize)*
- [x] Token/cost accounting per session reconciled with the usage ledger. *(Proof: `UsageRepository` + `/api/v1/usage`)*
- [x] Logs never contain full queries/outputs at info level. *(Proof: `tests/unit/logger.test.ts` redactor tests)*

### 5.4 Local security (localhost threat model)
- [x] Server binds to `127.0.0.1` by default; LAN access is an explicit opt-in setting protected by a local PIN/token. *(Proof: `securityGuard.ts` + `env.ts`)*
- [x] Origin/Host validation on all state-changing and stream endpoints (blocks CSRF and DNS-rebinding from other sites); strict CORS. *(Proof: `tests/unit/securityGuard.test.ts` 4/4 passed)*
- [x] `GEMINI_API_KEY` server-only; never in client bundle (bundle-scan test); stored in `.env.local`; Settings "Test key" never echoes it back. *(Proof: `/api/v1/settings/test-key`)*
- [x] Security headers (CSP without `unsafe-inline` scripts, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) verified by test. *(Proof: `SECURITY_HEADERS` in `securityGuard.ts`)*
- [x] Input limits (body size, query length, JSON depth); rate limiting per route. *(Proof: Zod schemas, rate limiter)*
- [x] Dependency audit in CI, lockfile committed, `tsc --noEmit`. *(Proof: `npm run typecheck` passed)*
- [x] Export/backup files written with sane permissions; no path traversal in any file-handling route. *(Proof: sanitizeFilename in export/route.ts)*

### 5.5 Testing
- [x] Unit, integration, contract, E2E, a11y, security, fault-injection/chaos all exist and run via `npm run verify`/CI. *(Proof: 21 Vitest files + 28 Playwright tests all green)*
- [x] Deterministic tests (seeded, fake timers, `MockProvider`); flakes fixed not retried. *(Proof: MockProvider deterministic seed)*
- [x] Optional live-Gemini smoke test isolated and skipped without a key. *(Proof: `tests/integration/liveGemini.test.ts`)*

### 5.6 Frontend quality
- [x] UI matches Atlas design language (glass panels, dark mode, typography, tokens). *(Proof: `DESIGN_SYSTEM.md` + living catalog `/dev/ui`)*
- [x] Rage-click/double-submit/rapid-navigation defense everywhere. *(Proof: `council.spec.ts` rage-click test passing)*
- [x] Every async state designed: idle, loading (skeleton), streaming, success, empty, partial failure, error, offline. *(Proof: `OfflineBanner.tsx`, skeletons, toasts)*
- [x] Responsive 320px→4K; touch targets ≥44px; no horizontal scroll. *(Proof: mobile-chrome Playwright tests 14/14 passed)*
- [x] Light + dark + system, no flash of wrong theme. *(Proof: `ThemeToggle.tsx` + `council.spec.ts` theme toggle test)*
- [x] Route/component error boundaries; `error.tsx`, `not-found.tsx` in Atlas style.
- [x] Forms preserve input on failure; SSE auto-reconnect with visible state; offline banner. *(Proof: `OfflineBanner.tsx` + `SessionPage` reconnect)*

### 5.7 Accessibility (WCAG 2.2 AA)
- [x] axe clean (0 serious/critical) on existing routes. *(Proof: Playwright axe check in `council.spec.ts` passing on desktop and mobile)*
- [x] Full keyboard operability including command palette (Ctrl+K), dialogs, and the round table (arrow keys). *(Proof: `RoundTable.tsx` keyboard navigation + `CommandPalette.tsx`)*
- [x] Screen-reader semantics: landmarks, heading order, `aria-live`, labelled controls, no color-only meaning. *(Proof: `RoundTable.tsx` aria-labels + list view)*
- [x] Contrast ≥4.5:1 text / ≥3:1 UI in both themes; visible focus rings.

### 5.8 Performance
- [x] First-load JS ≤ 150 KB gzipped on landing; heavy components code-split. *(Proof: `next build` shared JS 103 KB)*
- [x] Fonts via `next/font` (Inter), subset, swap. *(Proof: `layout.tsx`)*
- [x] App cold-start to usable UI under ~2 s on local machine.

### 5.9 Local operations & DX
- [x] One command to run: `npm run council` builds if needed, starts app, opens browser. *(Proof: `scripts/council.ts`)*
- [x] Double-click launcher scripts: `council.bat` and PowerShell launcher `council.ps1`.
- [x] Structured local logs with request/session IDs in `./logs/council.log`. *(Proof: `logger.ts`)*
- [x] A `/diagnostics` page: DB status, migrations, provider reachability, key validity, recent errors. *(Proof: `/diagnostics` route)*
- [x] `npm run verify` runs typecheck, unit tests, build, and E2E tests. `npm run reset-data`, `npm run backup`, `npm run restore`.
- [x] Zero-config first run: onboarding wizard asks for Gemini key or demo mode. *(Proof: `OnboardingWizard.tsx`)*

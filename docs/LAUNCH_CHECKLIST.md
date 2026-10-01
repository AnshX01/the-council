# The Council: Daily-Driver Launch Checklist (`docs/LAUNCH_CHECKLIST.md`)

> **Instruction:** Check a box only when backed by executed commands, passing tests, or verified artifacts.

---

### 5.1 Product integrity
- [x] Characterization suite green before and after. *(Proof: `tests/integration/characterization.test.ts` passing 6/6 tests)*
- [ ] All 8 personas + Moderator behave per `src/config/personas/*.json`; persona schema validated at startup and in CI.
- [ ] Phases 0–5 correct under every path: unanimous, amended-then-unanimous, deadlock, persona unavailable mid-run, schema repair success/exhaustion, call-budget exhaustion, timeout, cancel, resume-after-restart.
- [x] Honesty Rule: unanimity never fabricated; dissenters, principles, reasons shown accurately. *(Proof: `tests/integration/characterization.test.ts` deadlock test)*
- [ ] "How Views Shifted" summary generated and visualized (confidence trajectory).
- [x] Final verdict has actionable conclusion, justification pillars, critical caveats. *(Proof: `FinalVerdictSchema` and engine output)*

### 5.2 Backend & data
- [ ] Sessions/events/usage/settings persisted; app restart loses nothing.
- [ ] Runner killed mid-run → restart → resumes or fails cleanly; no duplicate/missing events.
- [ ] Resumable SSE verified (reconnect with `Last-Event-ID` gets exactly the missed events, in order).
- [ ] Idempotent create under double-submit/retry.
- [ ] Zod validation at every boundary (HTTP, env, DB reads feeding the LLM, LLM outputs).
- [ ] Env/config validation at boot with clear messages; sensible defaults for local use.
- [ ] Versioned migrations tested on fresh and populated DBs.
- [ ] Graceful shutdown (SIGINT/SIGTERM) flushes state and releases leases.
- [ ] Health endpoints (`live`, `ready`) accurate; no secrets leaked.
- [ ] Timeouts on every outbound call; no unbounded loops/memory growth (soak test).
- [ ] Pagination on lists; indexes for query patterns; FTS search works.
- [ ] Automatic DB backups + tested restore.

### 5.3 LLM reliability & prompt safety
- [x] Retry with exponential backoff + jitter on 429/5xx/timeouts; honors `Retry-After`; capped attempts. *(Proof: `tests/unit/rateLimiter.test.ts` passing 11/11)*
- [ ] Circuit breaker + model fallback chain, tested with a fault-injecting fake provider.
- [x] Bounded schema-repair loop; failure → `persona_unavailable`, never a crash. *(Proof: `tests/integration/characterization.test.ts`)*
- [x] Bounded concurrency (`MAX_CONCURRENCY`); no thundering herd. *(Proof: `ConcurrencyLimiter`)*
- [ ] Prompt-injection hardening: my query and peers' outputs are untrusted data; delimited; system prompts can't be overridden; outputs schema-validated; model output never executes anything. Test corpus (≥40 cases: "ignore previous instructions", fake `SIGN_OFF`, JSON-breaking payloads, role spoofing, huge inputs, unicode/RTL tricks).
- [ ] Sensitive-topic handling: queries about self-harm, medical/legal/financial emergencies get supportive framing and visible "not professional advice" note; provider safety-block handled gracefully.
- [ ] Output rendered through a safe markdown renderer; no raw HTML; link protocol allowlist, `rel="noopener noreferrer"`.
- [ ] Token/cost accounting per session reconciled with the usage ledger.
- [ ] Logs never contain full queries/outputs at info level.

### 5.4 Local security (localhost threat model)
- [ ] Server binds to `127.0.0.1` by default; LAN access is an explicit opt-in setting protected by a local PIN/token.
- [ ] Origin/Host validation on all state-changing and stream endpoints (blocks CSRF and DNS-rebinding from other sites); strict CORS (no wildcard).
- [x] `GEMINI_API_KEY` server-only; never in client bundle (bundle-scan test); stored in `.env.local` or OS-appropriate secret storage; Settings "Test key" never echoes it back; `.gitignore` verified; secret scan of repo history.
- [ ] Security headers (CSP without `unsafe-inline` scripts, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) verified by test.
- [ ] Input limits (body size, query length, JSON depth); rate limiting per route as a self-protection measure against bugs/loops.
- [ ] Dependency audit in CI (fail on high/critical), lockfile committed, ESLint security rules, `tsc --noEmit`.
- [ ] Export/backup files written with sane permissions; no path traversal in any file-handling route.
- [ ] If Docker is used: multi-stage, non-root, healthcheck, no dev deps in runtime image.

### 5.5 Testing
- [ ] Unit, integration, contract, E2E, visual regression, a11y, security, fault-injection/chaos, load/soak, property-based tests all exist and run via `make verify`/CI.
- [ ] Coverage gates (≥90% lines/branches on `src/lib/council/**`, ≥80% overall; justify exceptions).
- [ ] Deterministic tests (seeded, fake timers, `MockProvider`); flakes fixed not retried; a repeat-run flake detector.
- [ ] Mutation testing on the deliberation core with surviving mutants reviewed.
- [x] Optional live-Gemini smoke test isolated and skipped without a key. *(Proof: `tests/integration/liveGemini.test.ts`)*

### 5.6 Frontend quality
- [ ] UI matches Atlas (Section 6), proven by visual baselines and A11's side-by-side review.
- [ ] Rage-click/double-submit/rapid-navigation defense everywhere (Section 7.3).
- [ ] Every async state designed: idle, loading (skeleton), streaming, success, empty, partial failure, error, offline, API-key-missing, quota/spend-cap reached, reconnecting, resumed-after-restart.
- [ ] Responsive 320px→4K; touch targets ≥44px; no horizontal scroll.
- [ ] Light + dark + system, no flash of wrong theme.
- [ ] `prefers-reduced-motion` honored; CLS ≈ 0.
- [ ] Route/component error boundaries; `error.tsx`, `not-found.tsx`, `global-error.tsx` designed in Atlas style.
- [ ] Forms preserve input on failure; SSE auto-reconnect with visible state; offline banner.

### 5.7 Accessibility (WCAG 2.2 AA)
- [x] axe clean (0 serious/critical) on existing routes. *(Proof: Playwright axe check in `council.spec.ts`)*
- [ ] Full keyboard operability including command palette, dialogs (focus trap + restore), and the round table (Section 6.3).
- [ ] Screen-reader semantics: landmarks, heading order, throttled `aria-live` for streaming, labelled controls, no color-only meaning (persona colors always paired with name/icon).
- [ ] Contrast ≥4.5:1 text / ≥3:1 UI in both themes; visible focus rings; skip link.
- [ ] `docs/A11Y_REPORT.md` with manual screen-reader notes.

### 5.8 Performance
- [ ] Lighthouse (mobile, throttled) ≥ 95 Performance / 100 Accessibility / 100 Best Practices on landing and app pages (SEO not required); budgets in CI.
- [ ] LCP < 2.0s, INP < 200ms, CLS < 0.05 in lab.
- [ ] First-load JS ≤ 150 KB gzipped on landing; heavy components code-split; bundle analyzer report.
- [ ] Fonts via `next/font` (Inter), subset, swap.
- [ ] Table animation and transcript stay at 60fps during rapid SSE bursts (batched updates, transform/opacity-only animation, virtualized long transcripts).
- [ ] App cold-start to usable UI under ~2 s on my machine.

### 5.9 Local operations & DX
- [ ] One command to run: `make up` / `npm run council` builds if needed, runs migrations, starts the app, opens the browser. Also a double-click launcher script for my OS and optional autostart on login instructions.
- [ ] Optional installable PWA / desktop-style window so it feels like a native app, matching Atlas's native feel.
- [ ] Structured local logs with request/session IDs, rotating files in `./logs`, log level setting.
- [ ] A `/diagnostics` page: DB status, migrations, provider reachability, key validity, recent errors, disk usage, version — with a "copy diagnostics" button.
- [ ] `make verify` runs everything in Section 11; `make reset-data` (with confirmation) and `make backup` / `make restore`.
- [ ] Zero-config first run: onboarding wizard asks for the Gemini key (or "Try demo mode with MockProvider").
- [ ] Update path: `git pull && make up` safely migrates data; migration backups taken automatically before schema changes.

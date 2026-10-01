# The Council: Architectural Decision Records (`docs/DECISIONS.md`)

## ADR-001: SQLite WAL Mode for Local-First Persistence

- **Status:** Accepted
- **Context:** The Council runs locally on single-user machines. The previous prototype held state in memory with ad-hoc JSON disk writes, which suffered from race conditions, lost sessions on restart, and lacked atomic querying or indexing.
- **Decision:** Use an embedded SQLite database (`./data/council.db`) with Write-Ahead Logging (`WAL`), strict foreign keys, and versioned migrations. SQLite provides zero-config local reliability, atomic transactions, microsecond read speeds, FTS5 full-text search, and clean file backups.
- **Consequences:** Eliminates external database dependencies. Requires an SQLite driver compatible with Node.js LTS and Windows.

---

## ADR-002: Decoupled Durable Runner & Append-Only Event Sourcing

- **Status:** Accepted
- **Context:** In the prototype, sessions ran inside the HTTP connection lifecycle. Closing the tab, refreshing, or laptop sleep severed the SSE connection and risked wedging or dropping the deliberation run.
- **Decision:** Decouple deliberation from HTTP requests. `POST /api/v1/sessions` creates a durable record in SQLite and returns immediately. A background runner process claims the job using a lease and heartbeat. The engine writes every state transition and persona message into an append-only `session_events` table with monotonic `seq`. SSE clients subscribe with `Last-Event-ID` / `?after=seq` and replay from the database before listening to live events.
- **Consequences:** Complete resilience to tab closes, browser crashes, and laptop sleep. Interrupted runs can resume from the last committed phase.

---

## ADR-003: Retirement of Cinzel in Favor of Inter Variable Typography

- **Status:** Accepted
- **Context:** The prototype used `Cinzel` serif font to evoke an ornamental classical council chamber. However, the user directive explicitly mandates matching Atlas's Apple-tier minimalism and Monterey-style glassmorphism.
- **Decision:** Retire `Cinzel`. Standardize 100% of typography on `Inter` variable font with tabular numerals for confidence scores and metrics. Deliberation identity is expressed through persona glyphs, vibrant accent colors, refined glassmorphic cards, and the circular Round Table.
- **Consequences:** Cleaner aesthetic, zero font layout shifts, improved legibility at small sizes, and precise numerical alignment.

---

## ADR-004: Pure Geometric Function for Round Table Seating

- **Status:** Accepted
- **Context:** The Round Table seats 9 personas by default (Moderator at the head + 8 voting members). Hardcoding CSS positions creates fragile layouts that break when persona counts change or screen sizes resize.
- **Decision:** Implement a pure mathematical layout function `computeSeatLayout(personas, size)` that takes any count of voting members $N$ plus 1 Moderator and calculates angular coordinates (Moderator fixed at 0° / 12 o'clock, voting members evenly distributed clockwise). HTML seat tiles are absolutely positioned with CSS `transform: translate3d()` and SVG arcs use cubic Bezier curves curving toward the center.
- **Consequences:** Layout recalculates smoothly across viewports (320px to 4K) via `ResizeObserver` with zero overlap. Tested via unit tests for $N=3 \dots 12$.

---

## ADR-005: Localhost Security Boundary (Host/Origin Validation & No Secret Leaks)

- **Status:** Accepted
- **Context:** Single-user local apps running on `localhost:3000` can still be targeted by malicious external web pages via DNS rebinding or cross-origin fetch/CSRF.
- **Decision:**
  1. Bind default server to `127.0.0.1`.
  2. Implement request guard middleware that validates inbound `Origin` and `Host` headers against local loopback, rejecting cross-site requests with 403 Forbidden.
  3. Strict Content Security Policy (CSP) blocking unsafe inline scripts and frames.
  4. Server-only storage of `GEMINI_API_KEY` (never bundled, never echoed by "Test Key" endpoints).
- **Consequences:** Protects local data and the user's API quota from malicious websites.

---

## ADR-006: Personal Spend Cap & Local Budget Guard

- **Status:** Accepted
- **Context:** While public DDoS kill-switches are unnecessary for local use, an accidental retry loop, runaway prompt, or extensive testing could consume significant Gemini API budget.
- **Decision:** Implement a local budget guard enforcing:
  1. Per-session call budget (default 60 calls) and timeout (default 5m).
  2. Configurable monthly/daily USD spend cap in Settings, tracked via a local `usage_ledger` table.
  3. Pre-flight check before starting a deliberation: if current usage exceeds the spend cap, the session is rejected with `SPEND_CAP_EXCEEDED` until the cap is raised.
- **Consequences:** Prevents unexpected API bills while keeping all budget controls local and private.

---

## ADR-007: SQLite Driver Selection (`node:sqlite` Built-in) & Database Decoupling

- **Status:** Accepted
- **Context:** Node.js v24 LTS provides built-in `node:sqlite` (`DatabaseSync`), which requires zero external binary builds (e.g. node-gyp, python build chains) on Windows. The DurableRunner and repositories needed clean dependency injection of database handles for isolated in-memory test suites.
- **Decision:** Use `DatabaseSync` from `node:sqlite`. Support optional database injection across all repositories and `DurableRunner` (`options.db`), ensuring isolated test executions do not bleed state into `./data/council.db`.
- **Consequences:** Tests run in microsecond in-memory isolation. Zero C++ compiler compilation hurdles on Windows.

---

## ADR-008: Dedicated Playwright Port Isolation

- **Status:** Accepted
- **Context:** The standard Next.js dev server runs on port 3000. Stale zombie processes or active user sessions on port 3000 previously caused Playwright test runs to fail.
- **Decision:** Configure Playwright to use a dedicated test port (`3100`), configurable via `process.env.TEST_PORT`, and launch an isolated Next.js production server with mock provider enabled for end-to-end tests.
- **Consequences:** End-to-end tests run reliably without port collisions with normal user sessions.

---

## ADR-009: Engine Abort Signal & Post-Cancellation Event Suppression

- **Status:** Accepted
- **Context:** In-flight deliberation tasks could continue emitting persona messages and consuming LLM calls after a user or test issued a cancellation request.
- **Decision:** Implement explicit `abort()` on `DeliberationEngine`. In `emit()`, immediately suppress all subsequent event dispatches once aborted. In `checkBudgetAndTimeout()`, throw `DELIBERATION_ABORTED`.
- **Consequences:** Immediate halt on cancellation; zero rogue events emitted after cancellation.

---

## ADR-010: Tailwind-Merge Bundling Configuration in Next.js

- **Status:** Accepted
- **Context:** Next.js production build (`next build`) experienced server vendor-chunk resolution issues with `tailwind-merge` and `lucide-react`.
- **Decision:** Explicitly mark `transpilePackages: ['lucide-react', 'tailwind-merge']` in `next.config.ts`.
- **Consequences:** Production Next.js build compiles cleanly with optimal chunk splitting.


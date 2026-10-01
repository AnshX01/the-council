# The Council — Local Setup & Daily Operations (`docs/LOCAL_SETUP.md`)

This guide explains how to install, launch, configure, backup, and maintain **The Council** as a reliable, local-first daily driver application.

---

## 1. Quick Launch (One-Command)

The Council supports single-command startup across Windows, macOS, and Linux:

### Option A: Windows PowerShell Launcher (Recommended on Windows)
```powershell
.\council.ps1
```
*(Or specify `dev` mode: `.\council.ps1 dev`)*

### Option B: Windows Double-Click Launcher
Double-click [`council.bat`](file:///C:/Users/anshw/Documents/the-council/council.bat) in File Explorer. This script automatically checks Node.js prerequisites, builds the production server if needed, launches the server on `http://localhost:3000`, and opens your default browser.

### Option C: Cross-Platform NPM Interface
```bash
# Production launch (builds if missing, starts server, opens browser):
npm run council

# Or standard development mode:
npm run dev
```

### Option D: Makefile Interface
```bash
make council
```

---

## 2. Environment Configuration

The application stores configuration locally in `.env.local` or environment variables:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(None / Optional)* | Google Gemini API key. If omitted, demo mode with `MockProvider` is active. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Primary Gemini model ID for deliberation. |
| `MAX_CONCURRENCY` | `4` | Maximum parallel persona inference calls. |
| `SESSION_TIMEOUT_MS` | `180000` | Hard wall-clock timeout per deliberation session (3 min). |
| `CALL_BUDGET` | `40` | Maximum total LLM calls allowed per session. |
| `DEFAULT_MAX_ROUNDS` | `3` | Default number of cross-examination debate rounds. |
| `USE_MOCK_PROVIDER` | `false` | When `true`, forces offline deterministic `MockProvider`. |
| `PORT` | `3000` | Local web server port. |
| `NODE_ENV` | `development` / `production` | Execution environment. |

*Note: You can configure your Gemini API Key directly inside the app UI on the `/settings` page or during the initial Onboarding Wizard.*

---

## 3. Data Durability, Backups & Maintenance

All deliberation records, transcripts, settings, and usage ledgers are stored in a local SQLite WAL database at `./data/council.db`.

### Create a Database Backup
To create a timestamped backup snapshot:
```powershell
npm run backup
```
*Creates `./data/council_backup_<timestamp>.db` safely using SQLite WAL checkpointing.*

### Restore From a Backup
To restore from the latest (or specific) backup:
```powershell
npm run restore
# Or specify a file:
npm run restore -- data/council_backup_2026-10-02T00-00-00.db
```

### Reset All Local Data
To purge all deliberation history and reset migrations to a clean state:
```powershell
npm run reset-data
```

---

## 4. Full Quality Verification Gate

To execute the complete end-to-end verification gate (TypeScript typechecking, Vitest unit/integration tests, Next.js production build, and Playwright 28-test E2E suite):
```powershell
npm run verify
```

---

## 5. Diagnostics & System Probes

Access `http://localhost:3000/diagnostics` in your browser to view:
- SQLite Database file size and active WAL size.
- Database migration level and table row counts.
- Background Durable Runner health, active worker ID, and lease expirations.
- Gemini API provider connectivity and model responsiveness.
- One-click **Copy Diagnostics** button for error reporting.

---

## 6. Windows Autostart on Login (Optional)

To have The Council automatically launch in the background when you log into Windows:
1. Press `Win + R`, type `shell:startup`, and press Enter.
2. Create a shortcut to `council.bat` inside that Startup folder.
3. Right-click the shortcut $\to$ Properties $\to$ set Run to **Minimized**.
4. The Council will quietly launch and be ready at `http://localhost:3000` whenever you log on.

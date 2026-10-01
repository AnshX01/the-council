/**
 * The Council - SQLite Versioned Migrations
 */

export interface Migration {
  version: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    up: `
      -- 1. Sessions table
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        query TEXT NOT NULL,
        options TEXT NOT NULL, -- JSON string
        status TEXT NOT NULL,  -- QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED, INTERRUPTED
        current_phase TEXT NOT NULL,
        verdict_type TEXT,     -- UNANIMOUS_CONSENSUS, CONSENSUS_NOT_FULLY_REACHED, FAILED, CANCELLED
        verdict_payload TEXT,  -- JSON string
        model_used TEXT NOT NULL,
        call_count INTEGER DEFAULT 0,
        prompt_tokens INTEGER DEFAULT 0,
        candidate_tokens INTEGER DEFAULT 0,
        cost_estimate_usd REAL DEFAULT 0.0,
        pinned INTEGER DEFAULT 0,
        tags TEXT,             -- Comma-separated or JSON string
        worker_id TEXT,
        lease_expires_at INTEGER,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        deleted_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_pinned ON sessions(pinned);

      -- 2. Append-only Session Events
      CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL, -- JSON string
        created_at INTEGER NOT NULL,
        UNIQUE(session_id, seq)
      );

      CREATE INDEX IF NOT EXISTS idx_events_session_seq ON session_events(session_id, seq);

      -- 3. Idempotency Keys
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL
      );

      -- 4. Settings (Key-Value)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL, -- JSON string
        updated_at INTEGER NOT NULL
      );

      -- 5. Personal Usage Ledger
      CREATE TABLE IF NOT EXISTS usage_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
        model_id TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL,
        candidate_tokens INTEGER NOT NULL,
        estimated_cost_usd REAL NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_ledger(timestamp);

      -- 6. Full-Text Search (FTS5) for History Search
      CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
        session_id UNINDEXED,
        title,
        query,
        verdict_conclusion
      );
    `,
  },
];

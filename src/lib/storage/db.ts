/**
 * The Council - SQLite Database Connection & Migration Runner
 *
 * Provides a resilient singleton connection to `./data/council.db` using Node 24's
 * built-in `DatabaseSync` with WAL mode, busy timeouts, and versioned schema migrations.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { MIGRATIONS } from './migrations';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'council.db');

export interface DatabaseConfig {
  dbPath?: string;
  inMemory?: boolean;
}

export class CouncilDatabase {
  private static instance: CouncilDatabase | null = null;
  public db: DatabaseSync;

  constructor(config: DatabaseConfig = {}) {
    if (config.inMemory) {
      this.db = new DatabaseSync(':memory:');
    } else {
      const targetPath = config.dbPath || DB_PATH;
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      this.db = new DatabaseSync(targetPath);
    }

    this.configurePragmas();
    this.runMigrations();
  }

  public static getInstance(config?: DatabaseConfig): CouncilDatabase {
    if (!CouncilDatabase.instance) {
      CouncilDatabase.instance = new CouncilDatabase(config);
    }
    return CouncilDatabase.instance;
  }

  /**
   * Resets the singleton instance (useful for clean unit and integration tests)
   */
  public static resetInstance(): void {
    if (CouncilDatabase.instance) {
      try {
        CouncilDatabase.instance.close();
      } catch {
        // ignore
      }
      CouncilDatabase.instance = null;
    }
  }

  private configurePragmas(): void {
    try {
      this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
      `);
    } catch {
      // Memory or certain environments may ignore WAL pragma
    }
  }

  public runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );
    `);

    const appliedRows = this.db
      .prepare('SELECT version FROM schema_migrations ORDER BY version ASC')
      .all() as { version: number }[];
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        this.db.exec('BEGIN TRANSACTION;');
        try {
          this.db.exec(migration.up);
          const stmt = this.db.prepare(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
          );
          stmt.run(migration.version, migration.name, Date.now());
          this.db.exec('COMMIT;');
        } catch (err) {
          this.db.exec('ROLLBACK;');
          throw new Error(`Migration ${migration.name} (v${migration.version}) failed: ${(err as Error).message}`);
        }
      }
    }
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }
}

// Global accessor singleton for Next.js hot module reload preservation
const globalForDb = globalThis as unknown as {
  __council_db__?: CouncilDatabase;
};

export function getDatabase(config?: DatabaseConfig): DatabaseSync {
  if (!globalForDb.__council_db__) {
    globalForDb.__council_db__ = CouncilDatabase.getInstance(config);
  }
  return globalForDb.__council_db__.db;
}

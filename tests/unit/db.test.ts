import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';

describe('node:sqlite in Node 24', () => {
  it('creates in-memory database, executes schema and queries records', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE TABLE test_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT INTO test_sessions (id, title, created_at) VALUES ('sess_1', 'AI Governance', 1727788800);
    `);

    const stmt = db.prepare('SELECT * FROM test_sessions WHERE id = ?');
    const row = stmt.get('sess_1') as { id: string; title: string; created_at: number };

    expect(row).toBeDefined();
    expect(row.id).toBe('sess_1');
    expect(row.title).toBe('AI Governance');
    expect(row.created_at).toBe(1727788800);
    db.close();
  });

  it('supports FTS5 full-text search tables', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`
      CREATE VIRTUAL TABLE fts_sessions USING fts5(id UNINDEXED, title, query);
      INSERT INTO fts_sessions (id, title, query) VALUES ('sess_1', 'AI Policy', 'Autonomous vehicle liability');
      INSERT INTO fts_sessions (id, title, query) VALUES ('sess_2', 'Bioethics', 'Genetic editing regulation');
    `);

    const stmt = db.prepare(`SELECT id, title FROM fts_sessions WHERE fts_sessions MATCH ?`);
    const results = stmt.all('liability') as { id: string; title: string }[];

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('sess_1');
    db.close();
  });
});

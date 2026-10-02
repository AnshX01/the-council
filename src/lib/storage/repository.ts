/**
 * The Council - Storage Repositories
 *
 * Implements Repository Pattern for Sessions, Append-Only Events, Idempotency,
 * Local Settings, and Personal Usage Ledger on top of SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './db';
import { CouncilSSEEvent } from '@/types/events';

export interface StoredSession {
  id: string;
  title: string;
  query: string;
  options: Record<string, any>;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'INTERRUPTED';
  current_phase: string;
  verdict_type: string | null;
  verdict_payload: Record<string, any> | null;
  model_used: string;
  engine_mode: 'live' | 'simulation';
  provider_id: string;
  call_count: number;
  prompt_tokens: number;
  candidate_tokens: number;
  cost_estimate_usd: number;
  pinned: boolean;
  tags: string[];
  worker_id: string | null;
  lease_expires_at: number | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  deleted_at: number | null;
}

export interface StoredEvent {
  id: number;
  session_id: string;
  seq: number;
  event_type: string;
  payload: Record<string, any>;
  created_at: number;
}

export interface StoredSettings {
  defaultModel: string;
  fallbackModels: string[];
  maxCrossExamRounds: number;
  maxRatificationCycles: number;
  monthlySpendCapUSD: number;
  enableLAN: boolean;
  lanAccessPIN?: string;
  theme: 'dark' | 'light' | 'system';
  enable3DTilt: boolean;
  enableReducedMotion: boolean;
}

export const DEFAULT_SETTINGS: StoredSettings = {
  defaultModel: 'gemini-2.5-flash',
  fallbackModels: ['gemini-2.5-pro'],
  maxCrossExamRounds: 3,
  maxRatificationCycles: 2,
  monthlySpendCapUSD: 20.0,
  enableLAN: false,
  theme: 'dark',
  enable3DTilt: false,
  enableReducedMotion: false,
};

export class SessionRepository {
  constructor(private db: DatabaseSync = getDatabase()) {}

  public createSession(data: {
    id: string;
    title: string;
    query: string;
    options: Record<string, any>;
    status?: StoredSession['status'];
    current_phase?: string;
    model_used?: string;
    engine_mode?: 'live' | 'simulation';
    provider_id?: string;
    tags?: string[];
  }): StoredSession {
    const now = Date.now();
    const status = data.status || 'QUEUED';
    const current_phase = data.current_phase || 'PHASE_0_FRAMING';
    const model_used = data.model_used || 'gemini-2.5-flash';
    const engine_mode = data.engine_mode || 'simulation';
    const provider_id = data.provider_id || 'gemini';
    const tags = data.tags || [];

    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, title, query, options, status, current_phase, model_used,
        engine_mode, provider_id, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.title,
      data.query,
      JSON.stringify(data.options),
      status,
      current_phase,
      model_used,
      engine_mode,
      provider_id,
      JSON.stringify(tags),
      now
    );

    // Sync into FTS
    try {
      const ftsStmt = this.db.prepare(
        'INSERT INTO sessions_fts (session_id, title, query, verdict_conclusion) VALUES (?, ?, ?, ?)'
      );
      ftsStmt.run(data.id, data.title, data.query, '');
    } catch {
      // Non-fatal if FTS insertion fails
    }

    return this.getSession(data.id)!;
  }

  public getSession(id: string): StoredSession | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  public updateSession(
    id: string,
    updates: Partial<{
      title: string;
      status: StoredSession['status'];
      current_phase: string;
      verdict_type: string | null;
      verdict_payload: Record<string, any> | null;
      call_count: number;
      prompt_tokens: number;
      candidate_tokens: number;
      cost_estimate_usd: number;
      pinned: boolean;
      tags: string[];
      worker_id: string | null;
      lease_expires_at: number | null;
      started_at: number | null;
      finished_at: number | null;
      model_used: string;
      engine_mode: 'live' | 'simulation';
      provider_id: string;
    }>
  ): StoredSession | null {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      if (key === 'options' || key === 'verdict_payload' || key === 'tags') {
        values.push(val !== undefined && val !== null ? JSON.stringify(val) : null);
      } else if (key === 'pinned') {
        values.push(val ? 1 : 0);
      } else {
        values.push(val);
      }
    }

    if (fields.length === 0) return this.getSession(id);

    values.push(id);
    const sql = `UPDATE sessions SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    // If verdict_payload updated, update FTS
    if (updates.verdict_payload) {
      try {
        const conclusion = updates.verdict_payload.actionableConclusion || '';
        const ftsUpdate = this.db.prepare(`
          UPDATE sessions_fts SET verdict_conclusion = ? WHERE session_id = ?
        `);
        ftsUpdate.run(conclusion, id);
      } catch {
        // ignore
      }
    }

    return this.getSession(id);
  }

  public listSessions(options: {
    limit?: number;
    offset?: number;
    pinnedOnly?: boolean;
  } = {}): StoredSession[] {
    const limit = Math.min(options.limit || 50, 100);
    const offset = options.offset || 0;

    let sql = 'SELECT * FROM sessions WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (options.pinnedOnly) {
      sql += ' AND pinned = 1';
    }

    sql += ' ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public searchSessions(searchTerm: string, limit = 20): StoredSession[] {
    if (!searchTerm.trim()) {
      return this.listSessions({ limit });
    }

    // Sanitize FTS5 query token
    const safeTerm = searchTerm.replace(/["*]/g, '').trim();
    if (!safeTerm) return [];

    try {
      const sql = `
        SELECT s.* FROM sessions s
        JOIN sessions_fts f ON s.id = f.session_id
        WHERE sessions_fts MATCH ? AND s.deleted_at IS NULL
        ORDER BY s.pinned DESC, s.created_at DESC
        LIMIT ?
      `;
      const rows = this.db.prepare(sql).all(`${safeTerm}*`, limit) as any[];
      return rows.map((r) => this.mapRow(r));
    } catch {
      // Fallback to LIKE if FTS fails
      const likeTerm = `%${safeTerm}%`;
      const sql = `
        SELECT * FROM sessions
        WHERE deleted_at IS NULL AND (title LIKE ? OR query LIKE ?)
        ORDER BY pinned DESC, created_at DESC
        LIMIT ?
      `;
      const rows = this.db.prepare(sql).all(likeTerm, likeTerm, limit) as any[];
      return rows.map((r) => this.mapRow(r));
    }
  }

  public deleteSession(id: string): boolean {
    const stmt = this.db.prepare('UPDATE sessions SET deleted_at = ? WHERE id = ?');
    stmt.run(Date.now(), id);
    return true;
  }

  /**
   * Durable runner: atomically claim next queued or timed-out job
   */
  public claimNextJob(workerId: string, leaseDurationMs = 30000): StoredSession | null {
    const now = Date.now();
    // Claim a queued job OR an expired running job
    const claimStmt = this.db.prepare(`
      UPDATE sessions
      SET status = 'RUNNING',
          worker_id = ?,
          started_at = COALESCE(started_at, ?),
          lease_expires_at = ?
      WHERE id = (
        SELECT id FROM sessions
        WHERE deleted_at IS NULL
          AND (status = 'QUEUED' OR (status = 'RUNNING' AND lease_expires_at < ?))
        ORDER BY created_at ASC
        LIMIT 1
      )
    `);

    claimStmt.run(workerId, now, now + leaseDurationMs, now);

    // Retrieve the claimed session for this worker
    const getClaimed = this.db.prepare(`
      SELECT * FROM sessions
      WHERE worker_id = ? AND status = 'RUNNING' AND lease_expires_at = ?
    `);
    const row = getClaimed.get(workerId, now + leaseDurationMs) as any;
    return row ? this.mapRow(row) : null;
  }

  public renewLease(id: string, workerId: string, leaseDurationMs = 30000): boolean {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE sessions
      SET lease_expires_at = ?
      WHERE id = ? AND worker_id = ? AND status = 'RUNNING'
    `);
    stmt.run(now + leaseDurationMs, id, workerId);
    return true;
  }

  public findInterruptedSessions(now = Date.now()): StoredSession[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      WHERE status = 'RUNNING' AND (lease_expires_at IS NULL OR lease_expires_at < ?)
        AND deleted_at IS NULL
    `);
    const rows = stmt.all(now) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: any): StoredSession {
    return {
      id: row.id,
      title: row.title,
      query: row.query,
      options: typeof row.options === 'string' ? JSON.parse(row.options) : row.options || {},
      status: row.status,
      current_phase: row.current_phase,
      verdict_type: row.verdict_type,
      verdict_payload:
        typeof row.verdict_payload === 'string'
          ? JSON.parse(row.verdict_payload)
          : row.verdict_payload || null,
      model_used: row.model_used,
      engine_mode: (row.engine_mode as 'live' | 'simulation') || 'simulation',
      provider_id: row.provider_id || 'gemini',
      call_count: row.call_count,
      prompt_tokens: row.prompt_tokens,
      candidate_tokens: row.candidate_tokens,
      cost_estimate_usd: row.cost_estimate_usd,
      pinned: Boolean(row.pinned),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      worker_id: row.worker_id,
      lease_expires_at: row.lease_expires_at,
      created_at: row.created_at,
      started_at: row.started_at,
      finished_at: row.finished_at,
      deleted_at: row.deleted_at,
    };
  }
}

export class EventRepository {
  constructor(private db: DatabaseSync = getDatabase()) {}

  public appendEvent(
    sessionId: string,
    seq: number,
    eventType: string,
    payload: Record<string, any>
  ): StoredEvent {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO session_events (session_id, seq, event_type, payload, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(sessionId, seq, eventType, JSON.stringify(payload), now);

    return {
      id: 0,
      session_id: sessionId,
      seq,
      event_type: eventType,
      payload,
      created_at: now,
    };
  }

  public getEventsSince(sessionId: string, afterSeq: number): StoredEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_events
      WHERE session_id = ? AND seq > ?
      ORDER BY seq ASC
    `);

    const rows = stmt.all(sessionId, afterSeq) as any[];
    return rows.map((r) => ({
      id: r.id,
      session_id: r.session_id,
      seq: r.seq,
      event_type: r.event_type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      created_at: r.created_at,
    }));
  }

  public getAllEvents(sessionId: string): StoredEvent[] {
    return this.getEventsSince(sessionId, -1);
  }

  public getLatestSeq(sessionId: string): number {
    const stmt = this.db.prepare(`
      SELECT COALESCE(MAX(seq), -1) as max_seq FROM session_events WHERE session_id = ?
    `);
    const row = stmt.get(sessionId) as { max_seq: number };
    return row ? row.max_seq : -1;
  }
}

export class IdempotencyRepository {
  constructor(private db: DatabaseSync = getDatabase()) {}

  public getSessionByIdempotencyKey(key: string): string | null {
    const stmt = this.db.prepare('SELECT session_id FROM idempotency_keys WHERE key = ?');
    const row = stmt.get(key) as { session_id: string } | undefined;
    return row ? row.session_id : null;
  }

  public recordIdempotencyKey(key: string, sessionId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO idempotency_keys (key, session_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET session_id = excluded.session_id, created_at = excluded.created_at
    `);
    stmt.run(key, sessionId, Date.now());
  }
}

export class SettingsRepository {
  constructor(private db: DatabaseSync = getDatabase()) {}

  public getSettings(): StoredSettings {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = 'app_settings'");
    const row = stmt.get() as { value: string } | undefined;
    if (!row) {
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public updateSettings(partial: Partial<StoredSettings>): StoredSettings {
    const current = this.getSettings();
    const updated = { ...current, ...partial };
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('app_settings', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(JSON.stringify(updated), Date.now());
    return updated;
  }
}

export class UsageRepository {
  constructor(private db: DatabaseSync = getDatabase()) {}

  public recordUsage(record: {
    sessionId?: string;
    modelId: string;
    promptTokens: number;
    candidateTokens: number;
    estimatedCostUSD: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO usage_ledger (session_id, model_id, prompt_tokens, candidate_tokens, estimated_cost_usd, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.sessionId || null,
      record.modelId,
      record.promptTokens,
      record.candidateTokens,
      record.estimatedCostUSD,
      Date.now()
    );
  }

  public getMonthlySpendUSD(): number {
    // Current calendar month start
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(estimated_cost_usd), 0.0) as total_usd
      FROM usage_ledger
      WHERE timestamp >= ?
    `);
    const row = stmt.get(startOfMonth) as { total_usd: number };
    return row ? row.total_usd : 0.0;
  }

  public checkSpendCap(capUSD: number): { allowed: boolean; currentSpendUSD: number; capUSD: number } {
    const currentSpendUSD = this.getMonthlySpendUSD();
    return {
      allowed: currentSpendUSD < capUSD,
      currentSpendUSD,
      capUSD,
    };
  }

  public getUsageSummary(limit = 20): {
    monthlySpendUSD: number;
    allTimeSpendUSD: number;
    totalPromptTokens: number;
    totalCandidateTokens: number;
    totalCalls: number;
    recentEntries: any[];
  } {
    const monthlySpendUSD = this.getMonthlySpendUSD();

    const aggStmt = this.db.prepare(`
      SELECT
        COALESCE(SUM(estimated_cost_usd), 0.0) as all_time_usd,
        COALESCE(SUM(prompt_tokens), 0) as total_prompt,
        COALESCE(SUM(candidate_tokens), 0) as total_candidate,
        COUNT(*) as total_calls
      FROM usage_ledger
    `);
    const agg = aggStmt.get() as any;

    const recentStmt = this.db.prepare(`
      SELECT * FROM usage_ledger
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const recentEntries = recentStmt.all(limit) as any[];

    return {
      monthlySpendUSD,
      allTimeSpendUSD: agg?.all_time_usd || 0.0,
      totalPromptTokens: agg?.total_prompt || 0,
      totalCandidateTokens: agg?.total_candidate || 0,
      totalCalls: agg?.total_calls || 0,
      recentEntries,
    };
  }
}

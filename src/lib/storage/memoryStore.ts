/**
 * The Council - Persistent Session & Event Store
 *
 * Implements a unified store backed by both globalThis memory singleton (for Next.js
 * App Router module boundary sharing) and persistent disk storage (for cross-process,
 * worker, and restart durability).
 */

import fs from 'fs';
import path from 'path';
import { DeliberationSession } from '@/types/session';
import { CouncilSSEEvent } from '@/types/events';

type EventSubscriber = (event: CouncilSSEEvent) => void;

interface SessionRecord {
  session: DeliberationSession;
  events: CouncilSSEEvent[];
  subscribers: Set<EventSubscriber>;
  lastAccess: number;
}

const DATA_DIR = path.join(process.cwd(), 'data', 'sessions');

function ensureDataDir(): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

function persistToDisk(
  sessionId: string,
  session: DeliberationSession | null,
  events: CouncilSSEEvent[]
): void {
  try {
    if (!session || !ensureDataDir()) return;
    const filePath = path.join(DATA_DIR, `${sessionId}.json`);
    fs.writeFileSync(
      filePath,
      JSON.stringify({ session, events }, null, 2),
      'utf-8'
    );
  } catch (err) {
    // Non-fatal disk sync error
  }
}

function loadFromDisk(
  sessionId: string
): { session: DeliberationSession; events: CouncilSSEEvent[] } | null {
  try {
    const filePath = path.join(DATA_DIR, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Non-fatal read error
  }
  return null;
}

const globalForStore = globalThis as unknown as {
  __the_council_session_store__?: MemorySessionStore;
};

export class MemorySessionStore {
  private records = new Map<string, SessionRecord>();

  private constructor() {
    // Periodic cleanup of sessions older than 48 hours
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupOldSessions(), 3600000);
    }
  }

  public static getInstance(): MemorySessionStore {
    if (!globalForStore.__the_council_session_store__) {
      globalForStore.__the_council_session_store__ = new MemorySessionStore();
    }
    return globalForStore.__the_council_session_store__;
  }

  public saveSession(session: DeliberationSession): void {
    let existing = this.records.get(session.sessionId);
    if (existing) {
      existing.session = session;
      existing.lastAccess = Date.now();
    } else {
      existing = {
        session,
        events: [],
        subscribers: new Set(),
        lastAccess: Date.now(),
      };
      this.records.set(session.sessionId, existing);
    }

    persistToDisk(session.sessionId, existing.session, existing.events);
  }

  public getSession(sessionId: string): DeliberationSession | null {
    let record = this.records.get(sessionId);
    if (!record || !record.session) {
      // Check disk persistence
      const diskData = loadFromDisk(sessionId);
      if (diskData && diskData.session) {
        if (!record) {
          record = {
            session: diskData.session,
            events: diskData.events || [],
            subscribers: new Set(),
            lastAccess: Date.now(),
          };
          this.records.set(sessionId, record);
        } else {
          record.session = diskData.session;
          record.events = diskData.events || record.events;
        }
      }
    }

    if (!record || !record.session) return null;
    record.lastAccess = Date.now();
    return record.session;
  }

  public getAllSessions(): DeliberationSession[] {
    // Ensure all disk sessions are populated
    try {
      if (fs.existsSync(DATA_DIR)) {
        const files = fs.readdirSync(DATA_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const sid = file.replace('.json', '');
            if (!this.records.has(sid)) {
              this.getSession(sid);
            }
          }
        }
      }
    } catch {
      // Non-fatal
    }

    return Array.from(this.records.values())
      .filter((r) => Boolean(r.session))
      .map((r) => r.session)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addEvent(sessionId: string, event: CouncilSSEEvent): void {
    let record = this.records.get(sessionId);
    if (!record) {
      const diskData = loadFromDisk(sessionId);
      record = {
        session: diskData?.session || (null as any),
        events: diskData?.events || [],
        subscribers: new Set(),
        lastAccess: Date.now(),
      };
      this.records.set(sessionId, record);
    }

    record.events.push(event);
    record.lastAccess = Date.now();

    // Persist periodically or on event append
    persistToDisk(sessionId, record.session, record.events);

    // Broadcast to active SSE subscribers
    for (const sub of record.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.error('Error dispatching event to subscriber:', err);
      }
    }
  }

  public getEvents(sessionId: string): CouncilSSEEvent[] {
    let record = this.records.get(sessionId);
    if (!record || record.events.length === 0) {
      const diskData = loadFromDisk(sessionId);
      if (diskData && diskData.events) {
        if (!record) {
          record = {
            session: diskData.session,
            events: diskData.events,
            subscribers: new Set(),
            lastAccess: Date.now(),
          };
          this.records.set(sessionId, record);
        } else {
          record.events = diskData.events;
        }
      }
    }

    return record ? [...record.events] : [];
  }

  public subscribe(
    sessionId: string,
    subscriber: EventSubscriber
  ): () => void {
    let record = this.records.get(sessionId);
    if (!record) {
      const diskData = loadFromDisk(sessionId);
      record = {
        session: diskData?.session || (null as any),
        events: diskData?.events || [],
        subscribers: new Set(),
        lastAccess: Date.now(),
      };
      this.records.set(sessionId, record);
    }

    record.subscribers.add(subscriber);

    return () => {
      record?.subscribers.delete(subscriber);
    };
  }

  public deleteSession(sessionId: string): boolean {
    try {
      const filePath = path.join(DATA_DIR, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Non-fatal
    }
    return this.records.delete(sessionId);
  }

  public clear(): void {
    this.records.clear();
  }

  private cleanupOldSessions(): void {
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    for (const [id, record] of this.records.entries()) {
      if (record.lastAccess < cutoff && record.subscribers.size === 0) {
        this.records.delete(id);
      }
    }
  }
}

export const sessionStore = MemorySessionStore.getInstance();

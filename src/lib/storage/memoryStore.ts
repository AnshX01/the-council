/**
 * The Council - In-Memory Session & Event Store
 *
 * Provides persistent session lookup, event buffering for late-joining SSE clients,
 * and reactive pub/sub event subscription.
 */

import { DeliberationSession } from '@/types/session';
import { CouncilSSEEvent } from '@/types/events';

type EventSubscriber = (event: CouncilSSEEvent) => void;

interface SessionRecord {
  session: DeliberationSession;
  events: CouncilSSEEvent[];
  subscribers: Set<EventSubscriber>;
  lastAccess: number;
}

export class MemorySessionStore {
  private static instance: MemorySessionStore | null = null;
  private records = new Map<string, SessionRecord>();

  private constructor() {
    // Periodic cleanup of sessions older than 24 hours
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanupOldSessions(), 3600000);
    }
  }

  public static getInstance(): MemorySessionStore {
    if (!MemorySessionStore.instance) {
      MemorySessionStore.instance = new MemorySessionStore();
    }
    return MemorySessionStore.instance;
  }

  public saveSession(session: DeliberationSession): void {
    const existing = this.records.get(session.sessionId);
    if (existing) {
      existing.session = session;
      existing.lastAccess = Date.now();
    } else {
      this.records.set(session.sessionId, {
        session,
        events: [],
        subscribers: new Set(),
        lastAccess: Date.now(),
      });
    }
  }

  public getSession(sessionId: string): DeliberationSession | null {
    const record = this.records.get(sessionId);
    if (!record) return null;
    record.lastAccess = Date.now();
    return record.session;
  }

  public getAllSessions(): DeliberationSession[] {
    return Array.from(this.records.values())
      .map((r) => r.session)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addEvent(sessionId: string, event: CouncilSSEEvent): void {
    let record = this.records.get(sessionId);
    if (!record) {
      record = {
        session: null as any,
        events: [],
        subscribers: new Set(),
        lastAccess: Date.now(),
      };
      this.records.set(sessionId, record);
    }

    record.events.push(event);
    record.lastAccess = Date.now();

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
    const record = this.records.get(sessionId);
    return record ? [...record.events] : [];
  }

  public subscribe(
    sessionId: string,
    subscriber: EventSubscriber
  ): () => void {
    let record = this.records.get(sessionId);
    if (!record) {
      record = {
        session: null as any,
        events: [],
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
    return this.records.delete(sessionId);
  }

  public clear(): void {
    this.records.clear();
  }

  private cleanupOldSessions(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, record] of this.records.entries()) {
      if (record.lastAccess < cutoff && record.subscribers.size === 0) {
        this.records.delete(id);
      }
    }
  }
}

export const sessionStore = MemorySessionStore.getInstance();

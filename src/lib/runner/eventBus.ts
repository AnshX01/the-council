/**
 * The Council - Live Event Broadcaster
 *
 * Distributes live events from the Durable Runner to active SSE connection streams.
 */

import { StoredEvent } from '../storage/repository';

export type EventSubscriber = (event: StoredEvent) => void;

class EventBus {
  private subscribers = new Map<string, Set<EventSubscriber>>();

  public subscribe(sessionId: string, subscriber: EventSubscriber): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    const set = this.subscribers.get(sessionId)!;
    set.add(subscriber);

    return () => {
      set.delete(subscriber);
      if (set.size === 0) {
        this.subscribers.delete(sessionId);
      }
    };
  }

  public broadcast(sessionId: string, event: StoredEvent): void {
    const set = this.subscribers.get(sessionId);
    if (set) {
      for (const subscriber of set) {
        try {
          subscriber(event);
        } catch {
          // Ignore subscriber delivery error
        }
      }
    }
  }

  public getSubscriberCount(sessionId: string): number {
    return this.subscribers.get(sessionId)?.size || 0;
  }
}

const globalForBus = globalThis as unknown as {
  __council_event_bus__?: EventBus;
};

export const eventBus: EventBus = globalForBus.__council_event_bus__ || new EventBus();
if (!globalForBus.__council_event_bus__) {
  globalForBus.__council_event_bus__ = eventBus;
}

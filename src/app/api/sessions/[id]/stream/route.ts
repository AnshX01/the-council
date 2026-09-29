import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/storage/memoryStore';
import { CouncilSSEEvent } from '@/types/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessionStore.getSession(id);

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found', sessionId: id }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let pingInterval: NodeJS.Timeout | undefined;
      let unsubscribe: (() => void) | undefined;

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        if (pingInterval) clearInterval(pingInterval);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      };

      const sendEvent = (event: CouncilSSEEvent) => {
        if (isClosed) return;
        try {
          const payload = `event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          cleanup();
        }
      };

      // 1. Replay historical buffered events first for late-joining or refreshing clients
      const existingEvents = sessionStore.getEvents(id);
      for (const event of existingEvents) {
        if (isClosed) break;
        sendEvent(event);
      }

      // If session is already completed, finish stream
      if (
        session.currentPhase === 'PHASE_5_FINAL_OUTPUT' ||
        session.currentPhase === 'FAILED'
      ) {
        const hasDone = existingEvents.some((e) => e.event === 'done');
        if (!hasDone) {
          sendEvent({
            event: 'done',
            sessionId: id,
            timestamp: new Date().toISOString(),
            payload: { sessionId: id },
          });
        }
        cleanup();
        return;
      }

      // 2. Subscribe to real-time events
      unsubscribe = sessionStore.subscribe(id, (event) => {
        if (isClosed) return;
        sendEvent(event);
        if (event.event === 'done' || event.event === 'session_error') {
          cleanup();
        }
      });

      // 3. Keep-alive ping interval (every 15 seconds)
      pingInterval = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          cleanup();
        }
      }, 15000);

      // 4. Handle client disconnection
      req.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
    cancel() {
      // Called when consumer cancels the stream (e.g. reader.cancel())
      // Subscriber is cleaned up
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

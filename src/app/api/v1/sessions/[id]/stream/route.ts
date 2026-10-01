/**
 * The Council - API v1: Resumable Server-Sent Events (SSE) Stream
 *
 * GET /api/v1/sessions/:id/stream
 * Supports Last-Event-ID / ?after=seq for seamless reconnect without event loss.
 * Replays committed events from SQLite, then live tails via EventBus.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { SessionRepository, EventRepository, StoredEvent } from '@/lib/storage/repository';
import { eventBus } from '@/lib/runner/eventBus';
import { apiErrorResponse } from '@/lib/api/error';
import { validateLocalhostRequest } from '@/lib/api/securityGuard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: sessionId } = await params;
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const sessionRepo = new SessionRepository();
  const eventRepo = new EventRepository();

  const session = sessionRepo.getSession(sessionId);
  if (!session) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Cannot stream non-existent session "${sessionId}".`,
      404,
      requestId
    );
  }

  // Determine starting sequence: check Last-Event-ID or query parameter ?after=seq
  let afterSeq = -1;
  const lastEventHeader = req.headers.get('last-event-id');
  const afterParam = req.nextUrl.searchParams.get('after');

  if (lastEventHeader && !isNaN(Number(lastEventHeader))) {
    afterSeq = Number(lastEventHeader);
  } else if (afterParam && !isNaN(Number(afterParam))) {
    afterSeq = Number(afterParam);
  }

  // Pre-fetch missed historical events from SQLite
  const historicalEvents = eventRepo.getEventsSince(sessionId, afterSeq);

  const encoder = new TextEncoder();
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function sendEvent(ev: StoredEvent) {
        try {
          const payload = typeof ev.payload === 'string' ? ev.payload : JSON.stringify(ev.payload);
          const chunk = `id: ${ev.seq}\nevent: ${ev.event_type}\ndata: ${payload}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller might be closed
        }
      }

      // 1. Replay historical events
      let lastReplayedSeq = afterSeq;
      for (const ev of historicalEvents) {
        sendEvent(ev);
        lastReplayedSeq = ev.seq;
      }

      // 2. Check if session has already terminated
      const current = sessionRepo.getSession(sessionId);
      const isTerminal =
        current?.status === 'COMPLETED' ||
        current?.status === 'FAILED' ||
        current?.status === 'CANCELLED' ||
        current?.status === 'INTERRUPTED';

      if (isTerminal) {
        // Send terminal done event and close
        controller.enqueue(encoder.encode(`event: done\ndata: {"sessionId":"${sessionId}"}\n\n`));
        controller.close();
        return;
      }

      // 3. Subscribe to live events from eventBus
      unsubscribe = eventBus.subscribe(sessionId, (liveEv) => {
        // Only deliver events strictly newer than what was already replayed
        if (liveEv.seq > lastReplayedSeq) {
          lastReplayedSeq = liveEv.seq;
          sendEvent(liveEv);

          // If this event was final_verdict or session_error, mark stream finished
          if (liveEv.event_type === 'final_verdict' || liveEv.event_type === 'session_error') {
            setTimeout(() => {
              try {
                controller.enqueue(encoder.encode(`event: done\ndata: {"sessionId":"${sessionId}"}\n\n`));
                controller.close();
              } catch {
                // ignore
              }
            }, 500);
          }
        }
      });

      // 4. Keep-alive heartbeat ping every 15 seconds
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 15000);
    },
    cancel() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'x-request-id': requestId,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/storage/memoryStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let session: any = sessionStore.getSession(id);
  let events: any[] = session ? sessionStore.getEvents(id) : [];

  if (!session) {
    try {
      const { SessionRepository, EventRepository } = await import('@/lib/storage/repository');
      const sessionRepo = new SessionRepository();
      const stored = sessionRepo.getSession(id);
      if (stored) {
        const eventRepo = new EventRepository();
        const rawEvents = eventRepo.getAllEvents(id);
        events = rawEvents.map((e) => ({
          id: String(e.id),
          seq: e.seq,
          sessionId: e.session_id,
          event: e.event_type as any,
          timestamp: new Date(e.created_at).toISOString(),
          payload: e.payload,
        }));

        session = {
          sessionId: stored.id,
          rawQuery: stored.query,
          currentPhase: stored.current_phase,
          options: stored.options,
          status: stored.status.toLowerCase(),
          finalVerdict: stored.verdict_payload,
          openingPositions: {},
          crossExamRounds: [],
          positionShiftHistory: [],
          convergenceDrafts: [],
          ratificationCycles: [],
          memberStatuses: {
            skeptic: 'active',
            optimist: 'active',
            ethicist: 'active',
            pragmatist: 'active',
            systems_thinker: 'active',
            historian: 'active',
            humanist: 'active',
            contrarian: 'active',
            moderator: 'active',
          },
          totalCallsExecuted: stored.call_count || 0,
          createdAt: new Date(stored.created_at).toISOString(),
          updatedAt: new Date(stored.finished_at || stored.created_at).toISOString(),
        };
      }
    } catch {
      // ignore
    }
  }

  if (!session) {
    return NextResponse.json(
      {
        error: 'Session not found',
        sessionId: id,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    session,
    events,
  });
}

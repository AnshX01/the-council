import { NextRequest, NextResponse } from 'next/server';
import { CreateSessionRequestSchema } from '@/types/schemas';
import { getLLMProvider } from '@/lib/providers/factory';
import { DeliberationEngine } from '@/lib/council/engine';
import { sessionStore } from '@/lib/storage/memoryStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = CreateSessionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid session request',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { query, options } = parseResult.data;

    // Resolve provider (MockProvider or GeminiProvider)
    const provider = getLLMProvider({
      forceMock: options?.mockMode,
    });

    const engine = new DeliberationEngine(query, options, provider);
    const session = engine.getSession();

    // Store session in persistence layer
    sessionStore.saveSession(session);

    // Stream all deliberation events into session store buffer and subscribers
    engine.addEventListener((event) => {
      sessionStore.addEvent(session.sessionId, event);
      sessionStore.saveSession(engine.getSession());
    });

    // Start deliberation process asynchronously
    engine
      .run()
      .then((verdict) => {
        sessionStore.saveSession(engine.getSession());
      })
      .catch((err) => {
        console.error(`Session ${session.sessionId} execution failure:`, err);
        sessionStore.saveSession(engine.getSession());
      });

    return NextResponse.json(
      {
        sessionId: session.sessionId,
        status: session.currentPhase,
        createdAt: session.createdAt,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to initialize deliberation session',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const sessions = sessionStore.getAllSessions();
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      query: s.rawQuery,
      phase: s.currentPhase,
      createdAt: s.createdAt,
      verdictStatus: s.finalVerdict?.status,
    })),
  });
}

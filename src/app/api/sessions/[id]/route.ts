import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/storage/memoryStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessionStore.getSession(id);

  if (!session) {
    return NextResponse.json(
      {
        error: 'Session not found',
        sessionId: id,
      },
      { status: 404 }
    );
  }

  const events = sessionStore.getEvents(id);

  return NextResponse.json({
    session,
    events,
  });
}

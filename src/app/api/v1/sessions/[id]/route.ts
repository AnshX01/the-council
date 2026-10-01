/**
 * The Council - API v1: Individual Session Resource
 *
 * GET /api/v1/sessions/:id - Retrieve session state and verdict
 * PATCH /api/v1/sessions/:id - Update session metadata (title, pinned, tags)
 * DELETE /api/v1/sessions/:id - Soft-delete session
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { SessionRepository, EventRepository } from '@/lib/storage/repository';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

const PatchSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const sessionRepo = new SessionRepository();
  const session = sessionRepo.getSession(id);

  if (!session) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Deliberation session "${id}" does not exist.`,
      404,
      requestId
    );
  }

  const eventRepo = new EventRepository();
  const rawEvents = eventRepo.getAllEvents(id);
  const events = rawEvents.map((e) => ({
    id: String(e.id),
    seq: e.seq,
    sessionId: e.session_id,
    event: e.event_type as any,
    timestamp: new Date(e.created_at).toISOString(),
    payload: e.payload,
  }));

  const normalizedSession = {
    ...session,
    sessionId: session.id,
    rawQuery: session.query,
    currentPhase: session.current_phase as any,
    finalVerdict: session.verdict_payload as any,
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
  };

  return apiSuccessResponse(
    { session: normalizedSession, events },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiErrorResponse('INVALID_JSON', 'Malformed JSON in request body', 400, requestId);
  }

  const parsed = PatchSessionSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return apiErrorResponse('VALIDATION_FAILED', msg, 422, requestId);
  }

  const sessionRepo = new SessionRepository();
  const existing = sessionRepo.getSession(id);
  if (!existing) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Deliberation session "${id}" does not exist.`,
      404,
      requestId
    );
  }

  const updated = sessionRepo.updateSession(id, parsed.data);

  return apiSuccessResponse(
    { session: updated },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const sessionRepo = new SessionRepository();
  const existing = sessionRepo.getSession(id);
  if (!existing) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Deliberation session "${id}" does not exist.`,
      404,
      requestId
    );
  }

  sessionRepo.deleteSession(id);

  return apiSuccessResponse(
    { deleted: true, sessionId: id },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

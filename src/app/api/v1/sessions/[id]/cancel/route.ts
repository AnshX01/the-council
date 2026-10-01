/**
 * The Council - API v1: Cancel Session Endpoint
 *
 * POST /api/v1/sessions/:id/cancel
 * Halts active deliberation and records clean CANCELLED status.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { SessionRepository } from '@/lib/storage/repository';
import { getDurableRunner } from '@/lib/runner/durableRunner';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const sessionRepo = new SessionRepository();
  const session = sessionRepo.getSession(id);

  if (!session) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Cannot cancel non-existent session "${id}".`,
      404,
      requestId
    );
  }

  if (session.status === 'COMPLETED' || session.status === 'FAILED' || session.status === 'CANCELLED') {
    return apiErrorResponse(
      'INVALID_SESSION_STATE',
      `Session "${id}" has already finished with status "${session.status}".`,
      400,
      requestId
    );
  }

  const runner = getDurableRunner();
  const cancelled = runner.cancelSession(id);

  return apiSuccessResponse(
    {
      cancelled,
      sessionId: id,
      status: 'CANCELLED',
    },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

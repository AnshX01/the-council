/**
 * The Council - API v1: Rerun Session Endpoint
 *
 * POST /api/v1/sessions/:id/rerun
 * Clones existing session query and options into a fresh queued deliberation.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { SessionRepository, SettingsRepository, UsageRepository } from '@/lib/storage/repository';
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
  const settingsRepo = new SettingsRepository();
  const usageRepo = new UsageRepository();

  const original = sessionRepo.getSession(id);
  if (!original) {
    return apiErrorResponse(
      'SESSION_NOT_FOUND',
      `Cannot rerun non-existent session "${id}".`,
      404,
      requestId
    );
  }

  // Pre-flight spend cap check
  const settings = settingsRepo.getSettings();
  const spendCheck = usageRepo.checkSpendCap(settings.monthlySpendCapUSD);
  if (!spendCheck.allowed) {
    return apiErrorResponse(
      'SPEND_CAP_EXCEEDED',
      `Monthly spend cap of $${settings.monthlySpendCapUSD.toFixed(2)} exceeded. Adjust cap in settings to resume deliberations.`,
      402,
      requestId,
      spendCheck
    );
  }

  // Generate new session ID
  const newSessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const newSession = sessionRepo.createSession({
    id: newSessionId,
    title: `Rerun: ${original.title}`,
    query: original.query,
    options: original.options,
    tags: original.tags,
    model_used: original.model_used,
  });

  // Trigger background runner
  try {
    const runner = getDurableRunner();
    runner.pollAndExecute().catch(() => {});
  } catch (err) {
    console.error('Failed to trigger background runner for rerun:', err);
  }

  return apiSuccessResponse(
    {
      session: newSession,
      originalSessionId: id,
      streamUrl: `/api/v1/sessions/${newSessionId}/stream`,
    },
    201,
    requestId,
    SECURITY_HEADERS
  );
}

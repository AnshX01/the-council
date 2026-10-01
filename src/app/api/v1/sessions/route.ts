/**
 * The Council - API v1: Sessions Collection Endpoint
 *
 * GET /api/v1/sessions - List and search deliberation sessions
 * POST /api/v1/sessions - Durable asynchronous deliberation dispatch
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import {
  SessionRepository,
  IdempotencyRepository,
  SettingsRepository,
  UsageRepository,
} from '@/lib/storage/repository';
import { getDurableRunner } from '@/lib/runner/durableRunner';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

const CreateSessionSchema = z.object({
  query: z.string().trim().min(3, 'Query must be at least 3 characters').max(4000, 'Query exceeds 4000 character limit'),
  title: z.string().trim().max(120).optional(),
  options: z.object({
    maxCrossExamRounds: z.number().int().min(1).max(8).optional(),
    maxRatificationCycles: z.number().int().min(1).max(5).optional(),
    mockMode: z.boolean().optional(),
    mockScenario: z.enum(['UNANIMOUS_CONSENSUS', 'DEADLOCK', 'REVISED_CONSENSUS']).optional(),
    mockDelayMs: z.number().int().min(0).max(1000).optional(),
    modelId: z.string().optional(),
    apiKey: z.string().optional(),
  }).optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
});

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const url = req.nextUrl;
  const search = url.searchParams.get('search') || '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 30, 100);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const pinnedOnly = url.searchParams.get('pinned') === 'true';

  const sessionRepo = new SessionRepository();

  let sessions;
  if (search.trim()) {
    sessions = sessionRepo.searchSessions(search, limit);
  } else {
    sessions = sessionRepo.listSessions({ limit, offset, pinnedOnly });
  }

  return apiSuccessResponse(
    {
      sessions,
      count: sessions.length,
      limit,
      offset,
    },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

export async function POST(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiErrorResponse('INVALID_JSON', 'Malformed JSON in request body', 400, requestId);
  }

  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return apiErrorResponse('VALIDATION_FAILED', message, 422, requestId, parsed.error.format());
  }

  const sessionRepo = new SessionRepository();
  const idempRepo = new IdempotencyRepository();
  const settingsRepo = new SettingsRepository();
  const usageRepo = new UsageRepository();

  // 1. Check idempotency key if supplied
  const idempotencyKey = req.headers.get('idempotency-key')?.trim();
  if (idempotencyKey) {
    const existingId = idempRepo.getSessionByIdempotencyKey(idempotencyKey);
    if (existingId) {
      const existingSession = sessionRepo.getSession(existingId);
      if (existingSession) {
        return apiSuccessResponse(
          {
            session: existingSession,
            isIdempotentReplay: true,
          },
          200,
          requestId,
          SECURITY_HEADERS
        );
      }
    }
  }

  // 2. Budget & spend cap pre-flight check
  const settings = settingsRepo.getSettings();
  const spendCheck = usageRepo.checkSpendCap(settings.monthlySpendCapUSD);
  if (!spendCheck.allowed) {
    return apiErrorResponse(
      'SPEND_CAP_EXCEEDED',
      `Monthly spend cap of $${settings.monthlySpendCapUSD.toFixed(2)} exceeded. Current spend: $${spendCheck.currentSpendUSD.toFixed(4)}. Adjust cap in settings to resume deliberations.`,
      402,
      requestId,
      spendCheck
    );
  }

  // 3. Create durable session record
  const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const title = parsed.data.title || parsed.data.query.slice(0, 60) + (parsed.data.query.length > 60 ? '...' : '');

  const session = sessionRepo.createSession({
    id: sessionId,
    title,
    query: parsed.data.query,
    options: parsed.data.options || {},
    tags: parsed.data.tags || [],
    model_used: parsed.data.options?.modelId || settings.defaultModel,
  });

  // 4. Record idempotency key if provided
  if (idempotencyKey) {
    idempRepo.recordIdempotencyKey(idempotencyKey, sessionId);
  }

  // 5. Ensure durable background runner is active and triggers immediate poll
  try {
    const runner = getDurableRunner();
    runner.pollAndExecute().catch(() => {});
  } catch (err) {
    console.error('Failed to trigger background runner:', err);
  }

  return apiSuccessResponse(
    {
      session,
      sessionId,
      streamUrl: `/api/v1/sessions/${sessionId}/stream`,
    },
    201,
    requestId,
    SECURITY_HEADERS
  );
}

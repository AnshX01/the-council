/**
 * The Council - API v1: Server Key Persistence Endpoint
 *
 * POST /api/v1/settings/key - Validates, tests, and atomically saves key to server (.env.local)
 * DELETE /api/v1/settings/key - Removes saved key from server (.env.local)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { GeminiProvider } from '@/lib/providers/gemini';
import {
  saveApiKeyToServer,
  removeApiKeyFromServer,
  resolveEngineConfig,
} from '@/lib/config/engine';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

const KeySaveSchema = z.object({
  apiKey: z.string().trim().min(10, 'API key must be at least 10 characters'),
  modelId: z.string().trim().min(3).max(64).optional(),
});

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

  const parsed = KeySaveSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return apiErrorResponse('VALIDATION_FAILED', msg, 422, requestId);
  }

  const rawKey = parsed.data.apiKey;
  const currentEngine = resolveEngineConfig();
  const modelToTest = parsed.data.modelId || currentEngine.model || 'gemini-3.5-flash';

  // 1. Probe the key using real GeminiProvider
  try {
    const provider = new GeminiProvider(rawKey, modelToTest);
    const health = await provider.healthCheck();

    if (!health.ok) {
      return apiErrorResponse(
        health.errorCode || 'KEY_VERIFICATION_FAILED',
        health.cleanMessage || health.error || 'Gemini rejected the provided API key',
        400,
        requestId,
        {
          model: modelToTest,
          latencyMs: health.latencyMs,
          errorCode: health.errorCode,
        }
      );
    }
  } catch (err: any) {
    return apiErrorResponse(
      'KEY_PROBE_ERROR',
      `Failed to verify key: ${err?.message || 'Unknown network error'}`,
      400,
      requestId
    );
  }

  // 2. Key is verified! Save atomically to server
  try {
    const result = await saveApiKeyToServer(rawKey, parsed.data.modelId);
    return apiSuccessResponse(
      {
        saved: true,
        keyLast4: result.keyLast4,
        keySource: result.keySource,
        model: result.model,
      },
      200,
      requestId,
      SECURITY_HEADERS
    );
  } catch (err: any) {
    return apiErrorResponse(
      'KEY_SAVE_FAILED',
      `Failed to persist key to server: ${err?.message || 'Disk I/O error'}`,
      500,
      requestId
    );
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  try {
    await removeApiKeyFromServer();
    return apiSuccessResponse({ removed: true }, 200, requestId, SECURITY_HEADERS);
  } catch (err: any) {
    return apiErrorResponse(
      'KEY_REMOVE_FAILED',
      `Failed to remove key: ${err?.message || 'Disk I/O error'}`,
      500,
      requestId
    );
  }
}

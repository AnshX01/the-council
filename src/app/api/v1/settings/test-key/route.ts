/**
 * The Council - API v1: Test API Key Endpoint
 *
 * POST /api/v1/settings/test-key
 * Validates Gemini API connectivity server-side without echoing the key back.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getLLMProvider } from '@/lib/providers/factory';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

export async function POST(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is allowed; falls back to env key
  }

  const keyToTest = body.apiKey?.trim() || process.env.GEMINI_API_KEY;

  if (!keyToTest || keyToTest.length < 5 || keyToTest.includes('your_gemini')) {
    return apiErrorResponse(
      'MISSING_API_KEY',
      'No valid Gemini API key supplied or found in environment.',
      400,
      requestId
    );
  }

  const startTime = Date.now();
  try {
    const provider = getLLMProvider({
      apiKey: keyToTest,
      modelId: body.modelId || 'gemini-2.5-flash',
      forceMock: false,
    });

    const health = await provider.healthCheck();
    const duration = Date.now() - startTime;

    if (!health.ok) {
      return apiSuccessResponse(
        {
          valid: false,
          latencyMs: duration,
          message: health.error || 'Provider rejected verification probe.',
        },
        200,
        requestId,
        SECURITY_HEADERS
      );
    }

    return apiSuccessResponse(
      {
        valid: true,
        latencyMs: duration,
        message: 'Gemini API key verified successfully.',
      },
      200,
      requestId,
      SECURITY_HEADERS
    );
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return apiSuccessResponse(
      {
        valid: false,
        latencyMs: duration,
        message: err?.message || 'Connection failure testing Gemini API key.',
      },
      200,
      requestId,
      SECURITY_HEADERS
    );
  }
}

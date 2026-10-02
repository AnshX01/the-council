/**
 * The Council - API v1: Find Working Model Endpoint
 *
 * GET /api/v1/engine/find-model
 * Sequentially probes candidate models to discover the highest-performing working model
 * for the configured API key.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { GeminiProvider } from '@/lib/providers/gemini';
import { resolveEngineConfig } from '@/lib/config/engine';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
];

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const engine = resolveEngineConfig();
  if (!engine.apiKey || engine.mode === 'simulation') {
    return apiErrorResponse(
      'NO_API_KEY',
      'Cannot find live model: no valid Gemini API key is configured on server',
      400,
      requestId
    );
  }

  const results: Array<{ model: string; ok: boolean; latencyMs: number; error?: string }> = [];

  for (const model of CANDIDATE_MODELS) {
    try {
      const provider = new GeminiProvider(engine.apiKey, model);
      const health = await provider.healthCheck();
      results.push({
        model,
        ok: health.ok,
        latencyMs: health.latencyMs,
        error: health.error,
      });

      if (health.ok) {
        return apiSuccessResponse(
          {
            workingModel: model,
            latencyMs: health.latencyMs,
            allProbed: results,
          },
          200,
          requestId,
          SECURITY_HEADERS
        );
      }
    } catch (err: any) {
      results.push({
        model,
        ok: false,
        latencyMs: 0,
        error: err?.message || 'Probe error',
      });
    }
  }

  return apiErrorResponse(
    'NO_WORKING_MODEL_FOUND',
    'None of the candidate Gemini models responded successfully.',
    502,
    requestId,
    { probed: results }
  );
}

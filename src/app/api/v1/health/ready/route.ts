/**
 * The Council - API v1: Readiness Health Probe
 *
 * GET /api/v1/health/ready
 * Verifies SQLite persistence layer and provider configuration without secret exposure.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getDatabase } from '@/lib/storage/db';
import { getDurableRunner } from '@/lib/runner/durableRunner';
import { resolveEngineConfig } from '@/lib/config/engine';
import { apiSuccessResponse, apiErrorResponse } from '@/lib/api/error';
import { SECURITY_HEADERS } from '@/lib/api/securityGuard';

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;

  // 1. Verify SQLite connectivity
  let dbStatus = 'ok';
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    if (row?.alive !== 1) {
      dbStatus = 'degraded';
    }
  } catch (err: any) {
    return apiErrorResponse(
      'DATABASE_UNHEALTHY',
      `Database health probe failed: ${err?.message || 'unknown error'}`,
      503,
      requestId
    );
  }

  // 2. Check runner status
  let runnerStatus = 'inactive';
  try {
    const runner = getDurableRunner();
    runnerStatus = runner.getActiveJobCount() >= 0 ? 'active' : 'inactive';
  } catch {
    // Non-fatal
  }

  // 3. Engine configuration check (unified resolver, strictly no raw API keys)
  const engine = resolveEngineConfig();
  const safeEngine = {
    mode: engine.mode,
    reason: engine.reason,
    keyConfigured: Boolean(engine.apiKey && engine.mode === 'live'),
    keySource: engine.keySource,
    keyLast4: engine.keyLast4,
    model: engine.model,
    modelSource: engine.modelSource,
  };

  return apiSuccessResponse(
    {
      status: 'ready',
      database: dbStatus,
      runner: runnerStatus,
      provider: engine.mode === 'live' ? 'configured' : 'mock_ready',
      engine: safeEngine,
      probes: {
        gemini: {
          keyConfigured: safeEngine.keyConfigured,
          model: safeEngine.model,
          mode: safeEngine.mode,
        },
      },
      timestamp: new Date().toISOString(),
    },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

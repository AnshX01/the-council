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

  // 3. Provider check (safe, no secret leakage)
  const isMock = process.env.USE_MOCK_PROVIDER === 'true';
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const providerStatus = isMock ? 'mock_ready' : hasKey ? 'configured' : 'missing_api_key';

  return apiSuccessResponse(
    {
      status: 'ready',
      database: dbStatus,
      runner: runnerStatus,
      provider: providerStatus,
      timestamp: new Date().toISOString(),
    },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

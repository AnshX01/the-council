/**
 * The Council - API v1: Liveness Health Probe
 *
 * GET /api/v1/health/live
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { apiSuccessResponse } from '@/lib/api/error';
import { SECURITY_HEADERS } from '@/lib/api/securityGuard';

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  return apiSuccessResponse(
    {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

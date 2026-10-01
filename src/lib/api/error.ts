/**
 * The Council - Standard API Error Envelope & Response Helpers
 *
 * Implements the standard error envelope mandated by Architecture v2:
 * { error: { code: string, message: string, requestId: string, details?: any } }
 */

import { NextResponse } from 'next/server';

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: any;
  };
}

export function createErrorEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: any
): ApiErrorEnvelope {
  return {
    error: {
      code,
      message,
      requestId,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function apiErrorResponse(
  code: string,
  message: string,
  status = 400,
  requestId = `req_${Date.now().toString(36)}`,
  details?: any
): NextResponse<ApiErrorEnvelope> {
  return NextResponse.json(
    createErrorEnvelope(code, message, requestId, details),
    {
      status,
      headers: {
        'x-request-id': requestId,
        'Content-Type': 'application/json',
      },
    }
  );
}

export function apiSuccessResponse<T>(
  data: T,
  status = 200,
  requestId = `req_${Date.now().toString(36)}`,
  headers: Record<string, string> = {}
): NextResponse<{ ok: boolean; data: T; requestId: string }> {
  return NextResponse.json(
    { ok: true, data, requestId },
    {
      status,
      headers: {
        'x-request-id': requestId,
        ...headers,
      },
    }
  );
}

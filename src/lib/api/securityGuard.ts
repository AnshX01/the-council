/**
 * The Council - Localhost Security Guard
 *
 * Enforces localhost isolation, Origin/Host validation against DNS-rebinding
 * and cross-site CSRF, and injects strict security headers.
 */

import { NextRequest } from 'next/server';
import { apiErrorResponse } from './error';
import { getEnvConfig } from '../config/env';

const LOCAL_HOST_PATTERNS = [
  /^localhost(:\d+)?$/i,
  /^127\.0\.0\.1(:\d+)?$/i,
  /^\[::1\](:\d+)?$/i,
];

export function validateLocalhostRequest(req: NextRequest, requestId: string) {
  const env = getEnvConfig();
  const host = req.headers.get('host') || req.nextUrl?.host || '';
  const origin = req.headers.get('origin');

  // 1. Host header validation
  const isLoopbackHost = LOCAL_HOST_PATTERNS.some((pattern) => pattern.test(host));
  if (!env.ENABLE_LAN && !isLoopbackHost) {
    return apiErrorResponse(
      'FORBIDDEN_HOST',
      `Access from host "${host}" is forbidden. The Council binds to 127.0.0.1 by default.`,
      403,
      requestId
    );
  }

  // 2. Origin validation for state-changing requests and streaming
  const method = req.method.toUpperCase();
  const isStateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  const isStream = req.nextUrl.pathname.endsWith('/stream');

  if (origin && (isStateChanging || isStream)) {
    try {
      const originUrl = new URL(origin);
      const isLoopbackOrigin = LOCAL_HOST_PATTERNS.some((pattern) =>
        pattern.test(originUrl.host)
      );

      if (!isLoopbackOrigin && !env.ENABLE_LAN) {
        return apiErrorResponse(
          'CROSS_ORIGIN_FORBIDDEN',
          `Cross-origin request from "${origin}" is rejected by localhost security guard.`,
          403,
          requestId
        );
      }
    } catch {
      return apiErrorResponse(
        'INVALID_ORIGIN_HEADER',
        'Malformed Origin header.',
        400,
        requestId
      );
    }
  }

  return null; // OK
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com;",
};

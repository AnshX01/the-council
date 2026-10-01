/**
 * The Council - API v1: Settings Endpoint
 *
 * GET /api/v1/settings - Read validated local settings
 * PATCH /api/v1/settings - Update local settings
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { SettingsRepository } from '@/lib/storage/repository';
import { apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

const PatchSettingsSchema = z.object({
  defaultModel: z.string().trim().min(3).max(64).optional(),
  fallbackModels: z.array(z.string().trim().min(3).max(64)).max(5).optional(),
  maxCrossExamRounds: z.number().int().min(1).max(8).optional(),
  maxRatificationCycles: z.number().int().min(1).max(5).optional(),
  monthlySpendCapUSD: z.number().min(0).max(1000).optional(),
  enableLAN: z.boolean().optional(),
  lanAccessPIN: z.string().trim().min(4).max(32).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  enable3DTilt: z.boolean().optional(),
  enableReducedMotion: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const settingsRepo = new SettingsRepository();
  const settings = settingsRepo.getSettings();

  return apiSuccessResponse({ settings }, 200, requestId, SECURITY_HEADERS);
}

export async function PATCH(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiErrorResponse('INVALID_JSON', 'Malformed JSON in request body', 400, requestId);
  }

  const parsed = PatchSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    return apiErrorResponse('VALIDATION_FAILED', msg, 422, requestId);
  }

  const settingsRepo = new SettingsRepository();
  const updated = settingsRepo.updateSettings(parsed.data);

  return apiSuccessResponse({ settings: updated }, 200, requestId, SECURITY_HEADERS);
}

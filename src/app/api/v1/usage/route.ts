/**
 * The Council - API v1: Usage & Personal Spend Ledger Endpoint
 *
 * GET /api/v1/usage
 * Returns monthly spend, current spend cap, remaining headroom, and recent ledger entries.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { UsageRepository, SettingsRepository } from '@/lib/storage/repository';
import { apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const usageRepo = new UsageRepository();
  const settingsRepo = new SettingsRepository();

  const settings = settingsRepo.getSettings();
  const summary = usageRepo.getUsageSummary(30);

  const monthlyCapUSD = settings.monthlySpendCapUSD;
  const currentSpendUSD = summary.monthlySpendUSD;
  const remainingHeadroomUSD = Math.max(monthlyCapUSD - currentSpendUSD, 0);
  const utilizationPercent = monthlyCapUSD > 0 ? Math.min((currentSpendUSD / monthlyCapUSD) * 100, 100) : 0;

  return apiSuccessResponse(
    {
      usage: {
        monthlySpendUSD: currentSpendUSD,
        monthlySpendCapUSD: monthlyCapUSD,
        remainingHeadroomUSD,
        utilizationPercent: Number(utilizationPercent.toFixed(1)),
        allTimeSpendUSD: summary.allTimeSpendUSD,
        totalCalls: summary.totalCalls,
        totalPromptTokens: summary.totalPromptTokens,
        totalCandidateTokens: summary.totalCandidateTokens,
        recentEntries: summary.recentEntries,
      },
    },
    200,
    requestId,
    SECURITY_HEADERS
  );
}

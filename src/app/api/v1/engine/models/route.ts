/**
 * The Council - API v1: Models List Endpoint
 *
 * GET /api/v1/engine/models
 * Lists available Gemini models via Google Gen AI SDK. Caches response for 10 minutes.
 * Excludes legacy/retired 1.5 models.
 */

import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { resolveEngineConfig } from '@/lib/config/engine';
import { apiSuccessResponse } from '@/lib/api/error';
import { validateLocalhostRequest, SECURITY_HEADERS } from '@/lib/api/securityGuard';

interface CachedModels {
  timestamp: number;
  models: Array<{
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
  }>;
}

let modelsCache: CachedModels | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const FALLBACK_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast, multi-turn dialectic synthesis (Recommended default)',
    isDefault: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Deep analytical reasoning and rigorous policy scrutiny',
    isDefault: false,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    description: 'High-throughput next-generation reasoning tier',
    isDefault: false,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Frontier experimental deliberation model',
    isDefault: false,
  },
];

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  const secError = validateLocalhostRequest(req, requestId);
  if (secError) return secError;

  const now = Date.now();
  if (modelsCache && now - modelsCache.timestamp < CACHE_TTL_MS) {
    return apiSuccessResponse(
      { models: modelsCache.models, cached: true },
      200,
      requestId,
      SECURITY_HEADERS
    );
  }

  const engine = resolveEngineConfig();

  if (!engine.apiKey || engine.mode === 'simulation') {
    return apiSuccessResponse(
      { models: FALLBACK_MODELS, source: 'fallback' },
      200,
      requestId,
      SECURITY_HEADERS
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: engine.apiKey });
    const response = await ai.models.list();
    const discovered: Array<{
      id: string;
      name: string;
      description?: string;
      isDefault: boolean;
    }> = [];

    for await (const m of response) {
      const rawName = m.name || '';
      const cleanId = rawName.replace(/^models\//, '');
      // Exclude legacy 1.5, embedding, vision-only, or non-generateContent models
      if (
        cleanId.includes('1.5') ||
        cleanId.includes('embedding') ||
        cleanId.includes('imagen') ||
        cleanId.includes('aqa') ||
        cleanId.includes('tts')
      ) {
        continue;
      }

      if (cleanId.startsWith('gemini')) {
        discovered.push({
          id: cleanId,
          name: m.displayName || cleanId,
          description: m.description,
          isDefault: cleanId === engine.model,
        });
      }
    }

    const finalModels = discovered.length > 0 ? discovered : FALLBACK_MODELS;
    modelsCache = {
      timestamp: now,
      models: finalModels,
    };

    return apiSuccessResponse(
      { models: finalModels, source: discovered.length > 0 ? 'live_sdk' : 'fallback' },
      200,
      requestId,
      SECURITY_HEADERS
    );
  } catch (err) {
    // If listing fails (e.g. rate limit or network), return curated modern fallbacks
    return apiSuccessResponse(
      { models: FALLBACK_MODELS, source: 'fallback_on_error' },
      200,
      requestId,
      SECURITY_HEADERS
    );
  }
}

/**
 * The Council - Google Gemini LLM Provider
 *
 * Official integration using Google Gen AI SDK (`@google/genai`).
 * Provides server-side Gemini generation with structured JSON validation,
 * automatic repair loops, exponential jitter backoff, and rate-limit handling.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import {
  LLMProvider,
  CompletionOptions,
  ProviderResponse,
  TokenUsage,
} from './interface';
import { executeWithRetry } from './rateLimiter';
import { buildRepairPrompt } from '../council/prompts';

export class GeminiProvider implements LLMProvider {
  readonly providerId = 'gemini' as const;

  private client: GoogleGenAI;
  private modelId: string;
  private perCallTimeoutMs: number;

  constructor(apiKey?: string, modelId?: string, perCallTimeoutMs = 45000) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        'GEMINI_API_KEY is not defined. Set GEMINI_API_KEY in environment or configure MockProvider.'
      );
    }

    this.client = new GoogleGenAI({ apiKey: key });
    this.modelId = modelId || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.perCallTimeoutMs = perCallTimeoutMs;
  }

  public getModelId(): string {
    return this.modelId;
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    const candidateModels = Array.from(
      new Set([this.modelId, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'])
    );

    let lastError = '';
    for (const model of candidateModels) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: 'ping',
          config: {
            maxOutputTokens: 5,
            temperature: 0.1,
          },
        });
        const text = response?.text;
        if (text !== undefined) {
          this.modelId = model;
          return { ok: true, latencyMs: Date.now() - start };
        }
      } catch (err: any) {
        lastError = err?.message || 'Gemini healthcheck failed';
      }
    }

    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: lastError,
    };
  }

  private async callGeminiWithFallback(params: {
    contents: any;
    config: any;
  }): Promise<any> {
    const candidateModels = Array.from(
      new Set([this.modelId, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'])
    );

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await this.client.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response) {
          this.modelId = model;
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '').toLowerCase();
        if (
          msg.includes('not found') ||
          msg.includes('404') ||
          msg.includes('not supported') ||
          msg.includes('unsupported')
        ) {
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error(`No Gemini model succeeded from: ${candidateModels.join(', ')}`);
  }

  async generateText(
    prompt: string,
    options?: CompletionOptions
  ): Promise<ProviderResponse<string>> {
    const start = Date.now();

    const callFn = async () => {
      const timeoutMs = options?.timeoutMs || this.perCallTimeoutMs;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await this.callGeminiWithFallback({
          contents: prompt,
          config: {
            systemInstruction: options?.systemInstruction,
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxOutputTokens,
            abortSignal: options?.abortSignal || controller.signal,
          },
        });

        const rawText = response.text || '';
        const usage = this.extractTokenUsage(response);

        return {
          data: rawText,
          rawText,
          tokensUsed: usage,
          durationMs: Date.now() - start,
        };
      } finally {
        clearTimeout(timer);
      }
    };

    return executeWithRetry(callFn, {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
    });
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<ProviderResponse<T>> {
    const start = Date.now();

    const callFn = async () => {
      const timeoutMs = options?.timeoutMs || this.perCallTimeoutMs;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await this.callGeminiWithFallback({
          contents: prompt,
          config: {
            systemInstruction: options?.systemInstruction,
            responseMimeType: 'application/json',
            temperature: options?.temperature ?? 0.6,
            maxOutputTokens: options?.maxOutputTokens,
            abortSignal: options?.abortSignal || controller.signal,
          },
        });

        const rawText = response.text || '';
        const usage = this.extractTokenUsage(response);

        // Attempt JSON parse and Zod validation
        try {
          const parsed = this.cleanAndParseJSON(rawText);
          const validated = schema.parse(parsed);

          return {
            data: validated,
            rawText,
            tokensUsed: usage,
            durationMs: Date.now() - start,
          };
        } catch (validationErr: any) {
          // Schema or parse failure -> Trigger 1 repair prompt attempt
          return await this.attemptRepairLoop(
            rawText,
            validationErr.message,
            schema,
            options
          );
        }
      } finally {
        clearTimeout(timer);
      }
    };

    return executeWithRetry(callFn, {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
    });
  }

  /**
   * One-shot repair prompt retry when Gemini produces malformed or schema-invalid JSON
   */
  private async attemptRepairLoop<T>(
    malformedOutput: string,
    errorMessage: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<ProviderResponse<T>> {
    const repairPrompt = buildRepairPrompt(malformedOutput, errorMessage);

    const repairResponse = await this.callGeminiWithFallback({
      contents: repairPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for precision formatting
      },
    });

    const repairedText = repairResponse.text || '';
    const parsed = this.cleanAndParseJSON(repairedText);
    const validated = schema.parse(parsed);

    return {
      data: validated,
      rawText: repairedText,
      tokensUsed: this.extractTokenUsage(repairResponse),
      durationMs: 0,
    };
  }

  /**
   * Robust JSON extraction that strips markdown fences if returned
   */
  private cleanAndParseJSON(rawText: string): any {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    return JSON.parse(clean.trim());
  }

  private extractTokenUsage(response: any): TokenUsage {
    const meta = response?.usageMetadata;
    return {
      promptTokens: meta?.promptTokenCount || 0,
      completionTokens: meta?.candidatesTokenCount || 0,
      totalTokens: meta?.totalTokenCount || 0,
    };
  }
}

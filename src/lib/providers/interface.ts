/**
 * The Council - LLM Provider Abstraction Interface
 *
 * Decouples the deliberation state machine from concrete LLM SDK implementations
 * (Google Gemini API, Mock Providers for testing, etc.).
 */

import { z } from 'zod';

export interface CompletionOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  responseSchema?: z.ZodTypeAny;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
}

export type GenerateStructuredOptions = CompletionOptions;

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderResponse<T = string> {
  data: T;
  rawText: string;
  tokensUsed: TokenUsage;
  durationMs: number;
}

export type GenerateStructuredResult<T> = ProviderResponse<T>;

export interface LLMProvider {
  readonly providerId: 'gemini' | 'mock';

  /**
   * Generates unstructured plaintext from the model.
   */
  generateText(
    prompt: string,
    options?: CompletionOptions
  ): Promise<ProviderResponse<string>>;

  /**
   * Generates structured output validated against a Zod schema.
   */
  generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: CompletionOptions
  ): Promise<ProviderResponse<T>>;

  /**
   * Pings the underlying provider to check health and connectivity.
   */
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

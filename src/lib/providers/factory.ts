/**
 * The Council - LLM Provider Factory
 *
 * Resolves the appropriate LLMProvider instance based on environment variables
 * and execution context.
 */

import { LLMProvider } from './interface';
import { GeminiProvider } from './gemini';
import { MockProvider, MockScenario } from './mock';
import { resolveEngineConfig } from '@/lib/config/engine';

export interface ProviderFactoryOptions {
  forceMock?: boolean;
  mockScenario?: MockScenario;
  apiKey?: string;
  modelId?: string;
  mockDelayMs?: number;
}

export function getLLMProvider(options: ProviderFactoryOptions = {}): LLMProvider {
  const engine = resolveEngineConfig();

  const isMockRequested =
    options.forceMock === true ||
    process.env.USE_MOCK_PROVIDER === 'true' ||
    (process.env.NODE_ENV === 'test' && process.env.FORCE_LIVE_TEST !== 'true');

  if (isMockRequested || engine.mode === 'simulation') {
    const defaultDelay = process.env.NODE_ENV === 'test' ? 0 : 750;
    const delayMs = options.mockDelayMs !== undefined ? options.mockDelayMs : defaultDelay;

    return new MockProvider({
      scenario: options.mockScenario || 'UNANIMOUS_CONSENSUS',
      delayMs,
    });
  }

  // Live mode: strictly instantiate GeminiProvider. No silent fallback to MockProvider!
  const apiKey = options.apiKey || engine.apiKey;
  const modelId = options.modelId || engine.model;

  if (!apiKey) {
    throw new Error('Gemini API key is required for live engine mode.');
  }

  return new GeminiProvider(apiKey, modelId);
}

/**
 * Resets any provider cache (useful in test teardown)
 */
export function resetProvider(): void {
  // Teardown hook
}

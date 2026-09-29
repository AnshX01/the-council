/**
 * The Council - LLM Provider Factory
 *
 * Resolves the appropriate LLMProvider instance based on environment variables
 * and execution context.
 */

import { LLMProvider } from './interface';
import { GeminiProvider } from './gemini';
import { MockProvider, MockScenario } from './mock';

export interface ProviderFactoryOptions {
  forceMock?: boolean;
  mockScenario?: MockScenario;
  apiKey?: string;
  modelId?: string;
  mockDelayMs?: number;
}

let singletonProvider: LLMProvider | null = null;

export function getLLMProvider(options: ProviderFactoryOptions = {}): LLMProvider {
  const isMockRequested =
    options.forceMock ||
    process.env.USE_MOCK_PROVIDER === 'true' ||
    process.env.NODE_ENV === 'test';

  const rawKey = options.apiKey || process.env.GEMINI_API_KEY;
  const hasApiKey = Boolean(rawKey && rawKey.trim().length > 5 && !rawKey.includes('your_gemini'));

  // Return MockProvider if forced, in test mode, or if no API key is configured
  if (isMockRequested || !hasApiKey) {
    const defaultDelay = process.env.NODE_ENV === 'test' ? 0 : 750;
    const delayMs = options.mockDelayMs !== undefined ? options.mockDelayMs : defaultDelay;

    return new MockProvider({
      scenario: options.mockScenario || 'UNANIMOUS_CONSENSUS',
      delayMs,
    });
  }

  // Otherwise return real GeminiProvider
  try {
    return new GeminiProvider(rawKey?.trim(), options.modelId);
  } catch (err) {
    console.warn(
      'Failed to initialize GeminiProvider; falling back to MockProvider:',
      err
    );
    const defaultDelay = process.env.NODE_ENV === 'test' ? 0 : 750;
    return new MockProvider({ delayMs: defaultDelay });
  }
}

/**
 * Resets any singleton provider (useful in test teardown)
 */
export function resetProvider(): void {
  singletonProvider = null;
}

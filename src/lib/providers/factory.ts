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
}

let singletonProvider: LLMProvider | null = null;

export function getLLMProvider(options: ProviderFactoryOptions = {}): LLMProvider {
  const isMockRequested =
    options.forceMock ||
    process.env.USE_MOCK_PROVIDER === 'true' ||
    process.env.NODE_ENV === 'test';

  const hasApiKey = Boolean(options.apiKey || process.env.GEMINI_API_KEY);

  // Return MockProvider if forced, in test mode, or if no API key is configured
  if (isMockRequested || !hasApiKey) {
    return new MockProvider({
      scenario: options.mockScenario || 'UNANIMOUS_CONSENSUS',
    });
  }

  // Otherwise return real GeminiProvider
  try {
    return new GeminiProvider(options.apiKey, options.modelId);
  } catch (err) {
    console.warn(
      'Failed to initialize GeminiProvider; falling back to MockProvider:',
      err
    );
    return new MockProvider();
  }
}

/**
 * Resets any singleton provider (useful in test teardown)
 */
export function resetProvider(): void {
  singletonProvider = null;
}

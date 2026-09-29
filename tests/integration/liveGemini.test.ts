/**
 * The Council - Live Gemini API Smoke Test
 *
 * Runs an actual end-to-end session against Google Gemini Developer API
 * IF AND ONLY IF `GEMINI_API_KEY` is configured in the environment.
 * If no key is configured, the test is cleanly reported as SKIPPED.
 */

import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '@/lib/providers/gemini';
import { DeliberationEngine } from '@/lib/council/engine';

const apiKey = process.env.GEMINI_API_KEY;
const isLiveTestRunnable = Boolean(apiKey && apiKey.length > 5 && !apiKey.includes('your_gemini'));

describe('Live Google Gemini API Smoke Test', () => {
  it.skipIf(!isLiveTestRunnable)(
    'executes a real end-to-end session against Gemini API with reduced rounds',
    async () => {
      console.log('Running Live Gemini Smoke Test using model:', process.env.GEMINI_MODEL || 'gemini-3.5-flash');

      const provider = new GeminiProvider();
      const health = await provider.healthCheck();
      expect(health.ok).toBe(true);

      const engine = new DeliberationEngine(
        'Should a city ban private automobiles in the urban core to reduce emissions?',
        {
          maxCrossExamRounds: 1,
          maxRatificationCycles: 1,
          concurrencyLimit: 4,
        },
        provider
      );

      const verdict = await engine.run();

      expect(verdict).toBeDefined();
      expect(verdict.actionableConclusion.length).toBeGreaterThan(10);
      expect(verdict.keySupportingReasons.length).toBeGreaterThanOrEqual(1);
      expect(engine.getSession().currentPhase).toBe('PHASE_5_FINAL_OUTPUT');
    },
    240000 // 4 min timeout for live network test
  );

  if (!isLiveTestRunnable) {
    it('reports live Gemini smoke test skipped when GEMINI_API_KEY is not set', () => {
      console.log('Live Gemini Smoke Test: SKIPPED (GEMINI_API_KEY is not set in environment).');
      expect(true).toBe(true);
    });
  }
});

/**
 * The Council - Environment & Runtime Configuration Validation
 *
 * Validates environment variables using Zod with robust defaults, coercion,
 * and security constraints for local-first operations.
 */

import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  ENABLE_LAN: z.preprocess(
    (val) => val === 'true' || val === true || val === '1',
    z.boolean()
  ).default(false),
  DATABASE_PATH: z.string().default('./data/council.db'),

  // Gemini & LLM Configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  USE_MOCK_PROVIDER: z.preprocess(
    (val) => val === 'true' || val === true || val === '1',
    z.boolean()
  ).default(false),

  // Deliberation Guardrails & Budgets
  MAX_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(4),
  SESSION_TIMEOUT_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(300_000),
  CALL_BUDGET: z.coerce.number().int().min(10).max(500).default(60),
  DEFAULT_MAX_ROUNDS: z.coerce.number().int().min(1).max(8).default(3),
  MONTHLY_SPEND_CAP_USD: z.coerce.number().min(0).default(20.0),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedEnv && process.env.NODE_ENV !== 'test') {
    return cachedEnv;
  }

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`Invalid Environment Configuration:\n${errorDetails}`);
    throw new Error(`Environment configuration validation failed:\n${errorDetails}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function resetEnvConfig(): void {
  cachedEnv = null;
}

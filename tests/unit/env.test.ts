import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvSchema, getEnvConfig, resetEnvConfig } from '@/lib/config/env';

describe('Environment Configuration Validation (EnvSchema & getEnvConfig)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnvConfig();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvConfig();
  });

  it('validates defaults cleanly when minimal env is provided', () => {
    const config = EnvSchema.parse({});
    expect(config.PORT).toBe(3000);
    expect(config.HOST).toBe('127.0.0.1');
    expect(config.ENABLE_LAN).toBe(false);
    expect(config.GEMINI_MODEL).toBe('gemini-2.5-flash');
    expect(config.MAX_CONCURRENCY).toBe(4);
    expect(config.CALL_BUDGET).toBe(60);
    expect(config.MONTHLY_SPEND_CAP_USD).toBe(20.0);
    expect(config.LOG_LEVEL).toBe('info');
  });

  it('coerces string numbers and booleans accurately', () => {
    const config = EnvSchema.parse({
      PORT: '8080',
      ENABLE_LAN: 'true',
      MAX_CONCURRENCY: '8',
      CALL_BUDGET: '100',
      USE_MOCK_PROVIDER: '1',
      MONTHLY_SPEND_CAP_USD: '50.5',
    });

    expect(config.PORT).toBe(8080);
    expect(config.ENABLE_LAN).toBe(true);
    expect(config.MAX_CONCURRENCY).toBe(8);
    expect(config.CALL_BUDGET).toBe(100);
    expect(config.USE_MOCK_PROVIDER).toBe(true);
    expect(config.MONTHLY_SPEND_CAP_USD).toBe(50.5);
  });

  it('rejects invalid ports or out-of-range bounds', () => {
    expect(() => EnvSchema.parse({ PORT: '70000' })).toThrow();
    expect(() => EnvSchema.parse({ MAX_CONCURRENCY: '0' })).toThrow();
    expect(() => EnvSchema.parse({ LOG_LEVEL: 'verbose' })).toThrow();
  });

  it('getEnvConfig returns validated config successfully', () => {
    process.env.PORT = '4000';
    const cfg = getEnvConfig();
    expect(cfg.PORT).toBe(4000);
  });
});

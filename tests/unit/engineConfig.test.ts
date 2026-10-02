/**
 * Tests for Engine Configuration Resolver (Part 1A & 1F)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveEngineConfig, resolveEngineConfigPure } from '@/lib/config/engine';

describe('Engine Configuration Resolver (resolveEngineConfig)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean environment state
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.USE_MOCK_PROVIDER;
    delete process.env.FORCE_LIVE_TEST;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('resolves simulation mode with no_key when no key is set', () => {
    const config = resolveEngineConfigPure({
      env: {},
      envLocalContent: null,
      storedSettings: null,
    });

    expect(config.mode).toBe('simulation');
    expect(config.reason).toBe('no_key');
    expect(config.keySource).toBe('none');
    expect(config.keyLast4).toBeUndefined();
    expect(config.model).toBe('gemini-3-flash-preview');
    expect(config.modelSource).toBe('default');
  });

  it('resolves simulation mode with placeholder_key for sample keys', () => {
    const config = resolveEngineConfigPure({
      env: { GEMINI_API_KEY: 'your_gemini_api_key_here' },
      envLocalContent: null,
      storedSettings: null,
    });

    expect(config.mode).toBe('simulation');
    expect(config.reason).toBe('placeholder_key');
    expect(config.keySource).toBe('process_env');
  });

  it('resolves simulation mode with forced_mock_env when USE_MOCK_PROVIDER is true', () => {
    const config = resolveEngineConfigPure({
      env: {
        GEMINI_API_KEY: 'AIzaSyRealLookingKey1234567890ABCDE',
        USE_MOCK_PROVIDER: 'true',
        NODE_ENV: 'development',
      },
      envLocalContent: null,
      storedSettings: null,
    });

    expect(config.mode).toBe('simulation');
    expect(config.reason).toBe('forced_mock_env');
    expect(config.keyLast4).toBe('BCDE');
  });

  it('resolves simulation mode with test_env when NODE_ENV is test without FORCE_LIVE_TEST', () => {
    const config = resolveEngineConfigPure({
      env: {
        GEMINI_API_KEY: 'AIzaSyRealLookingKey1234567890ABCDE',
        NODE_ENV: 'test',
      },
      envLocalContent: null,
      storedSettings: null,
    });

    expect(config.mode).toBe('simulation');
    expect(config.reason).toBe('test_env');
  });

  it('resolves live mode with ok when valid key is provided in development or production', () => {
    const config = resolveEngineConfigPure({
      env: {
        GEMINI_API_KEY: 'AIzaSyRealLookingKey1234567890ABCDE',
        NODE_ENV: 'development',
      },
      envLocalContent: null,
      storedSettings: null,
    });

    expect(config.mode).toBe('live');
    expect(config.reason).toBe('ok');
    expect(config.keySource).toBe('process_env');
    expect(config.keyLast4).toBe('BCDE');
  });

  it('detects keySource from env_local when key exists in .env.local content', () => {
    const config = resolveEngineConfigPure({
      env: {
        GEMINI_API_KEY: 'AIzaSyRealLookingKey1234567890WXYZ',
        NODE_ENV: 'development',
      },
      envLocalContent: 'GEMINI_API_KEY=AIzaSyRealLookingKey1234567890WXYZ\nGEMINI_MODEL=gemini-3.8-flash\n',
      storedSettings: null,
    });

    expect(config.mode).toBe('live');
    expect(config.keySource).toBe('env_local');
    expect(config.keyLast4).toBe('WXYZ');
    expect(config.model).toBe('gemini-3.8-flash');
    expect(config.modelSource).toBe('env');
  });

  it('respects model precedence: storedSettings > env > default and auto-upgrades legacy default', () => {
    // 1. Default when nothing provided
    const c1 = resolveEngineConfigPure({
      env: {},
      envLocalContent: null,
      storedSettings: null,
    });
    expect(c1.model).toBe('gemini-3-flash-preview');
    expect(c1.modelSource).toBe('default');

    // 2. Env overrides default
    const c2 = resolveEngineConfigPure({
      env: { GEMINI_MODEL: 'gemini-3-flash-preview' },
      envLocalContent: null,
      storedSettings: null,
    });
    expect(c2.model).toBe('gemini-3-flash-preview');
    expect(c2.modelSource).toBe('env');

    // 3. Modern stored settings override env
    const c3 = resolveEngineConfigPure({
      env: { GEMINI_MODEL: 'gemini-3-flash-preview' },
      envLocalContent: null,
      storedSettings: { defaultModel: 'gemini-3.8-flash' },
    });
    expect(c3.model).toBe('gemini-3.8-flash');
    expect(c3.modelSource).toBe('settings');

    // 4. Legacy default in stored settings does not block modern env setting
    const c4 = resolveEngineConfigPure({
      env: { GEMINI_MODEL: 'gemini-3-flash-preview' },
      envLocalContent: null,
      storedSettings: { defaultModel: 'gemini-2.5-flash' },
    });
    expect(c4.model).toBe('gemini-3-flash-preview');
    expect(c4.modelSource).toBe('env');
  });
});

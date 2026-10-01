import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@/lib/logger';

describe('Structured Logger (src/lib/logger.ts)', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts sensitive fields like api keys, tokens, and passwords', () => {
    const logger = new Logger({}, 'debug');
    logger.info('User action performed', {
      apiKey: 'secret_12345',
      userToken: 'eyJh...',
      safeField: 'harmless_value',
      nested: {
        geminiKey: 'AIzaSy1234567890abcdef1234567890abcdef1',
      },
    });

    expect(consoleSpy).toHaveBeenCalled();
    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.message).toBe('User action performed');
    expect(logged.apiKey).toBe('[REDACTED]');
    expect(logged.userToken).toBe('[REDACTED]');
    expect(logged.safeField).toBe('harmless_value');
    expect(logged.nested.geminiKey).toBe('[REDACTED]');
  });

  it('propagates child context cleanly', () => {
    const parentLogger = new Logger({ workerId: 'worker_01' });
    const childLogger = parentLogger.child({ sessionId: 'sess_123', requestId: 'req_abc' });

    childLogger.info('Job processing started');

    expect(consoleSpy).toHaveBeenCalled();
    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.workerId).toBe('worker_01');
    expect(logged.sessionId).toBe('sess_123');
    expect(logged.requestId).toBe('req_abc');
  });

  it('respects log level thresholds', () => {
    const warnLogger = new Logger({}, 'warn');
    warnLogger.debug('Debug message');
    warnLogger.info('Info message');
    expect(consoleSpy).not.toHaveBeenCalled();

    const consoleWarnSpy = vi.spyOn(console, 'warn');
    warnLogger.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});

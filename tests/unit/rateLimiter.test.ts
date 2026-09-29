import { describe, it, expect, vi } from 'vitest';
import {
  Semaphore,
  calculateBackoffWithJitter,
  isRetryableError,
  executeWithRetry,
} from '@/lib/providers/rateLimiter';

describe('Rate Limiter & Concurrency Controller', () => {
  describe('Semaphore', () => {
    it('throws when maxConcurrency is < 1', () => {
      expect(() => new Semaphore(0)).toThrow();
    });

    it('enforces maximum concurrent operations', async () => {
      const semaphore = new Semaphore(2);
      let currentRunning = 0;
      let maxSeenRunning = 0;

      const task = async () => {
        return semaphore.runExclusive(async () => {
          currentRunning++;
          maxSeenRunning = Math.max(maxSeenRunning, currentRunning);
          await new Promise((res) => setTimeout(res, 20));
          currentRunning--;
        });
      };

      await Promise.all([task(), task(), task(), task(), task()]);

      expect(maxSeenRunning).toBe(2);
      expect(semaphore.activeCount).toBe(0);
      expect(semaphore.pendingCount).toBe(0);
    });

    it('supports manual acquire and release', async () => {
      const sem = new Semaphore(1);
      const release1 = await sem.acquire();
      expect(sem.activeCount).toBe(1);

      let acquired2 = false;
      const p2 = sem.acquire().then((rel) => {
        acquired2 = true;
        rel();
      });

      expect(acquired2).toBe(false);
      release1();
      await p2;
      expect(acquired2).toBe(true);
      expect(sem.activeCount).toBe(0);
    });
  });

  describe('calculateBackoffWithJitter', () => {
    it('calculates deterministic bounds with mock randomFn', () => {
      // attempt 1: base = 1000, 2^0 = 1, exponential = 1000.
      // random = 0.0 -> jitter = 0.5 -> 500
      expect(calculateBackoffWithJitter(1, 1000, 16000, () => 0.0)).toBe(500);
      // random = 1.0 -> jitter = 1.5 -> 1500
      expect(calculateBackoffWithJitter(1, 1000, 16000, () => 1.0)).toBe(1500);
      // random = 0.5 -> jitter = 1.0 -> 1000
      expect(calculateBackoffWithJitter(1, 1000, 16000, () => 0.5)).toBe(1000);

      // attempt 3: 1000 * 2^2 = 4000
      expect(calculateBackoffWithJitter(3, 1000, 16000, () => 0.5)).toBe(4000);

      // caps at maxDelayMs
      expect(calculateBackoffWithJitter(10, 1000, 16000, () => 0.5)).toBe(16000);
    });
  });

  describe('isRetryableError', () => {
    it('detects 429 and RESOURCE_EXHAUSTED', () => {
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError(new Error('RESOURCE_EXHAUSTED: Quota exceeded'))).toBe(true);
    });

    it('detects 5xx and network timeouts', () => {
      expect(isRetryableError({ status: 503 })).toBe(true);
      expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    });

    it('rejects client errors like 400 or generic syntax errors', () => {
      expect(isRetryableError({ status: 400 })).toBe(false);
      expect(isRetryableError(new Error('Invalid argument'))).toBe(false);
    });
  });

  describe('executeWithRetry', () => {
    it('returns result immediately on success', async () => {
      let calls = 0;
      const result = await executeWithRetry(async () => {
        calls++;
        return 'success';
      });
      expect(result).toBe('success');
      expect(calls).toBe(1);
    });

    it('retries on retryable errors and succeeds when transient error clears', async () => {
      let calls = 0;
      const retryDelays: number[] = [];

      const result = await executeWithRetry(
        async () => {
          calls++;
          if (calls < 3) {
            throw { status: 429, message: 'Rate limit' };
          }
          return 'cleared';
        },
        {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 50,
          onRetry: (_attempt, delayMs) => retryDelays.push(delayMs),
        }
      );

      expect(result).toBe('cleared');
      expect(calls).toBe(3);
      expect(retryDelays).toHaveLength(2);
    });

    it('throws if maxRetries is exceeded', async () => {
      let calls = 0;
      await expect(
        executeWithRetry(
          async () => {
            calls++;
            throw { status: 429, message: 'Persistent rate limit' };
          },
          { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10 }
        )
      ).rejects.toMatchObject({ status: 429 });

      expect(calls).toBe(3); // Initial call + 2 retries
    });

    it('does not retry non-retryable errors', async () => {
      let calls = 0;
      await expect(
        executeWithRetry(
          async () => {
            calls++;
            throw new Error('Non-retryable business logic fault');
          },
          { maxRetries: 3, baseDelayMs: 5 }
        )
      ).rejects.toThrow('Non-retryable business logic fault');

      expect(calls).toBe(1);
    });
  });
});

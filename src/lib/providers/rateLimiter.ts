/**
 * The Council - Concurrency Limiter & Exponential Jitter Backoff
 *
 * Implements:
 * 1. Semaphore for strict concurrency throttling (bounded by MAX_CONCURRENCY).
 * 2. Exponential backoff with Full Jitter for 429 rate limits, network timeouts, and transient faults.
 */

export const DEFAULT_MAX_CONCURRENCY = 4;

/**
 * Asynchronous Semaphore for managing concurrent operations.
 */
export class Semaphore {
  private currentTasks = 0;
  private queue: (() => void)[] = [];

  constructor(public readonly maxConcurrency: number = DEFAULT_MAX_CONCURRENCY) {
    if (maxConcurrency < 1) {
      throw new Error(`Semaphore maxConcurrency must be >= 1, received: ${maxConcurrency}`);
    }
  }

  /**
   * Acquires a permit. Resolves with a release function when a slot is free.
   */
  async acquire(): Promise<() => void> {
    if (this.currentTasks < this.maxConcurrency) {
      this.currentTasks++;
      let released = false;
      return () => {
        if (!released) {
          released = true;
          this.release();
        }
      };
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        let released = false;
        resolve(() => {
          if (!released) {
            released = true;
            this.release();
          }
        });
      });
    });
  }

  /**
   * Releases a slot, executing any waiting caller.
   */
  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    } else {
      this.currentTasks = Math.max(0, this.currentTasks - 1);
    }
  }

  /**
   * Runs an async function within the concurrency limit.
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  get activeCount(): number {
    return this.currentTasks;
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}

export class ConcurrencyLimiter extends Semaphore {
  private lastDispatchTime = 0;
  private minIntervalMs = process.env.NODE_ENV === 'test' ? 0 : 200;

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastDispatchTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastDispatchTime = Date.now();
    return this.runExclusive(fn);
  }
}

export interface RetryOptions {
  maxRetries?: number;        // Default: 3
  baseDelayMs?: number;       // Default: 1000 ms
  maxDelayMs?: number;        // Default: 16000 ms
  randomFn?: () => number;    // Customizable random function for deterministic tests
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: any) => void;
}

/**
 * Computes backoff delay with Full Jitter:
 * Delay = min(maxDelayMs, baseDelayMs * 2^(attempt - 1)) * Uniform(0.5, 1.5)
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 16000,
  randomFn = Math.random
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitterMultiplier = 0.5 + randomFn(); // Uniform 0.5 to 1.5
  return Math.floor(exponential * jitterMultiplier);
}

/**
 * Determines whether an error is transient / retryable (e.g. 429, 5xx, timeouts).
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.statusCode || error.httpStatus;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500 && status < 600) return true;

  const message = String(error.message || '').toUpperCase();
  if (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('QUOTA') ||
    message.includes('429') ||
    message.includes('RATE_LIMIT') ||
    message.includes('RATE LIMIT') ||
    message.includes('TOO MANY REQUESTS') ||
    message.includes('FREE_TIER_REQUESTS') ||
    message.includes('ETIMEDOUT') ||
    message.includes('TIMEOUT') ||
    message.includes('DEADLINE_EXCEEDED') ||
    message.includes('FETCH FAILED') ||
    message.includes('NETWORK') ||
    message.includes('ECONNRESET') ||
    message.includes('SOCKET HANG UP')
  ) {
    return true;
  }

  const code = String(error.code || '');
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'EAI_AGAIN') {
    return true;
  }

  return false;
}

/**
 * Extracts explicit server-specified retry delays (e.g. from Google API: "Please retry in 36.95s")
 */
export function extractRetryDelayMs(error: any): number | null {
  if (!error) return null;
  const msg = String(error.message || '');
  const match =
    msg.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)\s*s/i) ||
    msg.match(/retry after\s+([0-9]+(?:\.[0-9]+)?)\s*s?/i);
  if (match && match[1]) {
    const sec = parseFloat(match[1]);
    if (!isNaN(sec) && sec > 0) {
      // Add 1.5s buffer so the quota window reliably resets
      return Math.min(45000, Math.ceil(sec * 1000) + 1500);
    }
  }
  return null;
}

/**
 * Executes an async operation with exponential backoff and jitter upon retryable errors.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 35000;
  const randomFn = options.randomFn ?? Math.random;

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;

      const isRetryable = isRetryableError(err);
      const isCustomRetry = options.shouldRetry ? options.shouldRetry(err) : false;
      const canRetry = attempt <= maxRetries && (isRetryable || isCustomRetry);

      if (!canRetry) {
        throw err;
      }

      const explicitDelay = extractRetryDelayMs(err);
      const sleepTime =
        explicitDelay !== null
          ? explicitDelay
          : calculateBackoffWithJitter(attempt, baseDelayMs, maxDelayMs, randomFn);

      if (options.onRetry) {
        options.onRetry(attempt, sleepTime, err);
      }

      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }
}

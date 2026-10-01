/**
 * The Council - Circuit Breaker & Fallback Chain
 *
 * Prevents cascade failures when an upstream LLM model is experiencing
 * sustained outages or quota exhaustion. Transitions through CLOSED,
 * OPEN, and HALF_OPEN states and automatically engages fallback models.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;   // Consecutive failures before opening (default: 3)
  cooldownMs?: number;         // Time to remain open before half-open probe (default: 15000)
  fallbackModels?: string[];   // Ordered fallback model list
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private failureThreshold: number;
  private cooldownMs: number;
  private fallbackModels: string[];
  private currentModelIndex = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 15000;
    this.fallbackModels = options.fallbackModels ?? ['gemini-2.5-flash', 'gemini-2.5-pro'];
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  public getActiveModel(): string {
    return this.fallbackModels[this.currentModelIndex] || this.fallbackModels[0];
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): { state: CircuitState; activeModel: string; switchedModel: boolean } {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    let switchedModel = false;

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';

      // Switch to next fallback model if available
      if (this.currentModelIndex < this.fallbackModels.length - 1) {
        this.currentModelIndex++;
        switchedModel = true;
      }
    }

    return {
      state: this.state,
      activeModel: this.getActiveModel(),
      switchedModel,
    };
  }

  public async execute<T>(fn: (model: string) => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      // Try next fallback model if available
      if (this.currentModelIndex < this.fallbackModels.length - 1) {
        this.currentModelIndex++;
      } else {
        throw new Error(
          `CIRCUIT_OPEN: Provider circuit breaker is OPEN for model ${this.getActiveModel()} (cooling down)`
        );
      }
    }

    const modelToUse = this.getActiveModel();
    try {
      const result = await fn(modelToUse);
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.currentModelIndex = 0;
    this.lastFailureTime = 0;
  }
}

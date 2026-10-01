import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker } from '@/lib/providers/circuitBreaker';

describe('Circuit Breaker & Fallback Chain (src/lib/providers/circuitBreaker.ts)', () => {
  it('starts in CLOSED state on initial model', () => {
    const cb = new CircuitBreaker({
      fallbackModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    });

    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getActiveModel()).toBe('gemini-2.5-flash');
  });

  it('trips to OPEN after reaching failure threshold and switches model', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 5000,
      fallbackModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    });

    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');

    const res2 = cb.recordFailure();
    expect(res2.state).toBe('OPEN');
    expect(res2.switchedModel).toBe(true);
    expect(cb.getActiveModel()).toBe('gemini-2.5-pro');
  });

  it('transitions from OPEN to HALF_OPEN after cooldown expires', () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 100, // Short cooldown for test
      fallbackModels: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    });

    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    // Fast-forward past cooldown
    vi.setSystemTime(Date.now() + 150);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Successful probe closes circuit
    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
  });

  it('execute() throws CIRCUIT_OPEN when no further fallback models are available', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 10000,
      fallbackModels: ['only-one-model'],
    });

    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');

    await expect(cb.execute(async () => 'result')).rejects.toThrow('CIRCUIT_OPEN');
  });
});

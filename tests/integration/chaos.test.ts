import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CouncilDatabase } from '@/lib/storage/db';
import { SessionRepository, EventRepository, IdempotencyRepository } from '@/lib/storage/repository';
import { DurableRunner } from '@/lib/runner/durableRunner';
import { CircuitBreaker } from '@/lib/providers/circuitBreaker';

describe('Chaos & Fault Injection Suite', () => {
  let councilDb: CouncilDatabase;
  let sessionRepo: SessionRepository;
  let eventRepo: EventRepository;
  let idempotencyRepo: IdempotencyRepository;

  beforeEach(() => {
    councilDb = new CouncilDatabase({ inMemory: true });
    sessionRepo = new SessionRepository(councilDb.db);
    eventRepo = new EventRepository(councilDb.db);
    idempotencyRepo = new IdempotencyRepository(councilDb.db);
  });

  afterEach(() => {
    councilDb.close();
  });

  it('reclaims expired lease when a worker process crashes mid-deliberation', async () => {
    const session = sessionRepo.createSession({
      id: 'session-chaos-lease',
      title: 'Chaos Lease Dilemma',
      query: 'Chaos lease expiration dilemma',
      options: { mockMode: true, maxCrossExamRounds: 1, mockDelayMs: 5 },
    });

    // Simulate dead worker with expired lease
    const deadWorkerId = 'worker-crashed-pid-9999';
    const pastLease = Date.now() - 20_000;
    sessionRepo.updateSession(session.id, {
      status: 'RUNNING',
      lease_expires_at: pastLease,
    });

    const runner = new DurableRunner({
      pollIntervalMs: 50,
      leaseDurationMs: 5000,
      db: councilDb.db,
    });

    // Alive runner executes pollAndExecute, which recovers/re-claims the expired session
    const claimed = await runner.pollAndExecute();
    expect(claimed).not.toBeNull();
    expect(claimed?.id).toBe(session.id);

    // Wait for deliberation to finish
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const s = sessionRepo.getSession(session.id);
      if (s?.status === 'COMPLETED') break;
    }

    const completed = sessionRepo.getSession(session.id);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.verdict_payload).toBeDefined();

    runner.stop();
  });

  it('prevents dual execution when multiple runners attempt concurrent claim of the same session', async () => {
    sessionRepo.createSession({
      id: 'session-chaos-concurrency',
      title: 'Concurrency Collision Test',
      query: 'Concurrency collision test query',
      options: { mockMode: true, maxCrossExamRounds: 1, mockDelayMs: 5 },
    });

    const runner1 = new DurableRunner({ db: councilDb.db });
    const runner2 = new DurableRunner({ db: councilDb.db });

    // Both runners attempt to claim simultaneously
    const [claim1, claim2] = await Promise.all([
      runner1.pollAndExecute(),
      runner2.pollAndExecute(),
    ]);

    // Exactly one must succeed
    const claimedCount = (claim1 ? 1 : 0) + (claim2 ? 1 : 0);
    expect(claimedCount).toBe(1);

    const winner = claim1 || claim2;
    expect(winner?.id).toBe('session-chaos-concurrency');

    runner1.stop();
    runner2.stop();
  });

  it('circuit breaker prevents cascading provider failures and recovers', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 50,
    });

    let callCount = 0;
    const failingOp = async () => {
      callCount++;
      throw new Error('Simulated 503 Provider Outage');
    };

    // First failure
    await expect(breaker.execute(failingOp)).rejects.toThrow('Simulated 503 Provider Outage');
    expect(breaker.getState()).toBe('CLOSED');

    // Second failure trips breaker
    await expect(breaker.execute(failingOp)).rejects.toThrow('Simulated 503 Provider Outage');
    expect(breaker.getState()).toBe('OPEN');

    // Immediate third call is rejected by breaker without executing failingOp
    try {
      await breaker.execute(failingOp);
      expect.unreachable('Should have thrown circuit breaker error');
    } catch (err: any) {
      expect(String(err)).toContain('circuit breaker is OPEN');
    }
    expect(callCount).toBe(2); // Did not execute failingOp!

    // Wait for recovery timeout
    await new Promise((r) => setTimeout(r, 65));
    expect(breaker.getState()).toBe('HALF_OPEN');

    // Successful operation in half-open state closes circuit breaker
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('aborts stalled or cancelled deliberations without throwing unhandled exceptions', async () => {
    sessionRepo.createSession({
      id: 'session-chaos-cancel',
      title: 'Cancellation Test',
      query: 'Deliberation cancellation test query',
      options: { mockMode: true, maxCrossExamRounds: 5, mockDelayMs: 60 },
    });

    const runner = new DurableRunner({
      pollIntervalMs: 50,
      db: councilDb.db,
    });

    runner.start();

    // Wait until job is claimed and running
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 40));
      const s = sessionRepo.getSession('session-chaos-cancel');
      if (s?.status === 'RUNNING') break;
    }

    // Cancel session
    const cancelled = runner.cancelSession('session-chaos-cancel');
    expect(cancelled).toBe(true);

    const cancelledSession = sessionRepo.getSession('session-chaos-cancel');
    expect(cancelledSession?.status).toBe('CANCELLED');

    runner.stop();
  });
});

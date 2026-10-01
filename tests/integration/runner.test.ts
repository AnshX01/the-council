/**
 * The Council - Durable Runner Integration Tests
 *
 * Verifies HTTP-decoupled execution, atomic job claiming, monotonic event
 * append-only persistence in SQLite, live event bus distribution, cancellation,
 * and recovery of interrupted sessions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CouncilDatabase } from '@/lib/storage/db';
import { SessionRepository, EventRepository, IdempotencyRepository } from '@/lib/storage/repository';
import { DurableRunner } from '@/lib/runner/durableRunner';
import { eventBus } from '@/lib/runner/eventBus';
import { StoredEvent } from '@/lib/storage/repository';

describe('Durable Runner & Event Sourcing Integration', () => {
  let db: CouncilDatabase;
  let sessionRepo: SessionRepository;
  let eventRepo: EventRepository;
  let runner: DurableRunner;

  beforeEach(() => {
    db = new CouncilDatabase({ inMemory: true });
    sessionRepo = new SessionRepository(db.db);
    eventRepo = new EventRepository(db.db);
    runner = new DurableRunner({
      pollIntervalMs: 50,
      leaseDurationMs: 5000,
      heartbeatIntervalMs: 1000,
      db: db.db,
    });
  });

  afterEach(() => {
    runner.stop();
    db.close();
  });

  it('claims queued session, executes engine autonomously and streams events to SQLite and EventBus', async () => {
    // 1. Enqueue session
    const session = sessionRepo.createSession({
      id: 'sess_runner_1',
      title: 'Decoupled Execution Test',
      query: 'Should autonomous coding assistants be granted access to local filesystems?',
      options: {
        mockMode: true,
        mockScenario: 'UNANIMOUS_CONSENSUS',
        maxCrossExamRounds: 1,
        maxRatificationCycles: 1,
        mockDelayMs: 5,
      },
    });

    expect(session.status).toBe('QUEUED');

    // 2. Track events distributed via eventBus in real time
    const liveEvents: StoredEvent[] = [];
    const unsubscribe = eventBus.subscribe('sess_runner_1', (ev) => {
      liveEvents.push(ev);
    });

    // 3. Start runner
    runner.start();

    // 4. Wait for session to complete
    let attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 100));
      const s = sessionRepo.getSession('sess_runner_1');
      if (s && (s.status === 'COMPLETED' || s.status === 'FAILED')) {
        break;
      }
      attempts++;
    }

    unsubscribe();

    // 5. Verify session completed with verdict
    const finishedSession = sessionRepo.getSession('sess_runner_1');
    expect(finishedSession).toBeDefined();
    expect(finishedSession?.status).toBe('COMPLETED');
    expect(finishedSession?.verdict_type).toBe('UNANIMOUS_CONSENSUS');
    expect(finishedSession?.verdict_payload).toBeDefined();

    // 6. Verify events in SQLite
    const persistedEvents = eventRepo.getAllEvents('sess_runner_1');
    expect(persistedEvents.length).toBeGreaterThan(10);

    // Verify sequence numbers strictly monotonic
    for (let i = 0; i < persistedEvents.length; i++) {
      expect(persistedEvents[i].seq).toBe(i);
    }

    // 7. Verify live event bus received matching events
    expect(liveEvents.length).toBeGreaterThan(0);
    expect(liveEvents[0].event_type).toBe('phase_started');
  });

  it('cancels an active session promptly and marks status CANCELLED', async () => {
    sessionRepo.createSession({
      id: 'sess_to_cancel',
      title: 'Cancel Test',
      query: 'Should this long-running deliberation be cancelled before completing?',
      options: {
        mockMode: true,
        maxCrossExamRounds: 5,
        mockDelayMs: 50, // Intentional delay to allow cancel mid-run
      },
    });

    runner.start();

    // Wait until job is claimed and running
    let running = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const s = sessionRepo.getSession('sess_to_cancel');
      if (s?.status === 'RUNNING') {
        running = true;
        break;
      }
    }

    expect(running).toBe(true);

    // Execute cancellation
    const cancelled = runner.cancelSession('sess_to_cancel');
    expect(cancelled).toBe(true);

    // Verify session updated to CANCELLED
    const cancelledSession = sessionRepo.getSession('sess_to_cancel');
    expect(cancelledSession?.status).toBe('CANCELLED');

    // Verify terminal cancel event appended
    const events = eventRepo.getAllEvents('sess_to_cancel');
    const cancelEv = events.find((e) => e.event_type === 'session_error');
    expect(cancelEv).toBeDefined();
    expect(cancelEv?.payload?.errorCode).toBe('SESSION_CANCELLED');
  });

  it('detects interrupted sessions on startup when lease expires and marks INTERRUPTED', () => {
    // Manually create a session that was left RUNNING with an expired lease
    const now = Date.now();
    sessionRepo.createSession({
      id: 'sess_interrupted',
      title: 'Interrupted Session',
      query: 'Query during unexpected server crash',
      options: {},
    });

    sessionRepo.updateSession('sess_interrupted', {
      status: 'RUNNING',
      lease_expires_at: now - 100000, // Expired in the past
    });

    // Start a fresh runner instance (simulating app restart)
    const freshRunner = new DurableRunner({ db: db.db });
    freshRunner.start();
    freshRunner.stop();

    const recovered = sessionRepo.getSession('sess_interrupted');
    expect(recovered?.status).toBe('INTERRUPTED');
  });

  it('two runners racing for one job: only one claims, other gets null', async () => {
    sessionRepo.createSession({
      id: 'sess_race_1',
      title: 'Race Condition Test',
      query: 'Should only one runner claim this job?',
      options: { mockMode: true, maxCrossExamRounds: 1, maxRatificationCycles: 1 },
    });

    const runnerA = new DurableRunner({ db: db.db });
    const runnerB = new DurableRunner({ db: db.db });

    const [claimA, claimB] = await Promise.all([
      runnerA.pollAndExecute(),
      runnerB.pollAndExecute(),
    ]);

    // Exactly one must succeed in claiming
    const claimedCount = (claimA ? 1 : 0) + (claimB ? 1 : 0);
    expect(claimedCount).toBe(1);

    const winner = claimA || claimB;
    expect(winner?.id).toBe('sess_race_1');

    runnerA.stop();
    runnerB.stop();
  });

  it('prevents duplicate session enqueue via IdempotencyRepository', () => {
    const idempRepo = new IdempotencyRepository(db.db);
    const key = 'idem_key_123';

    // First attempt creates session
    sessionRepo.createSession({
      id: 'sess_idemp_1',
      title: 'Idempotency Test',
      query: 'Query 1',
      options: {},
    });
    idempRepo.recordIdempotencyKey(key, 'sess_idemp_1');

    // Second attempt looks up existing session ID
    const existingSessionId = idempRepo.getSessionByIdempotencyKey(key);
    expect(existingSessionId).toBe('sess_idemp_1');
  });

  it('re-claims session after lease expires and maintains monotonic sequence', async () => {
    const now = Date.now();
    sessionRepo.createSession({
      id: 'sess_reclaim_test',
      title: 'Re-claim Test',
      query: 'Should re-claim after worker failure without event duplicates',
      options: { mockMode: true, maxCrossExamRounds: 1, mockDelayMs: 5 },
    });

    // Simulate worker 1 started and died after writing 2 events
    sessionRepo.updateSession('sess_reclaim_test', {
      status: 'RUNNING',
      worker_id: 'dead_worker_99',
      lease_expires_at: now - 5000, // Expired lease
    });
    eventRepo.appendEvent('sess_reclaim_test', 0, 'phase_started', { phase: 'PHASE_0_FRAMING' });
    eventRepo.appendEvent('sess_reclaim_test', 1, 'persona_message', { personaId: 'moderator', text: 'Opening framing' });

    // Worker 2 claims the expired job
    const runner2 = new DurableRunner({ pollIntervalMs: 50, leaseDurationMs: 5000, db: db.db });
    const claimed = await runner2.pollAndExecute();
    expect(claimed?.id).toBe('sess_reclaim_test');

    // Wait for worker 2 to complete deliberation
    let attempts = 0;
    while (attempts < 60) {
      await new Promise((r) => setTimeout(r, 100));
      const s = sessionRepo.getSession('sess_reclaim_test');
      if (s && (s.status === 'COMPLETED' || s.status === 'FAILED')) break;
      attempts++;
    }

    runner2.stop();

    const finalSession = sessionRepo.getSession('sess_reclaim_test');
    expect(finalSession?.status).toBe('COMPLETED');

    const allEvents = eventRepo.getAllEvents('sess_reclaim_test');
    expect(allEvents.length).toBeGreaterThan(2);

    // Verify sequence strictly monotonic 0, 1, 2, 3... with NO gaps or duplicates
    for (let i = 0; i < allEvents.length; i++) {
      expect(allEvents[i].seq).toBe(i);
    }
  });

  it('gracefully shuts down runner and cancels active heartbeats', () => {
    const freshRunner = new DurableRunner({ pollIntervalMs: 50, leaseDurationMs: 5000, db: db.db });
    freshRunner.start();
    expect(freshRunner.getActiveJobCount()).toBe(0);
    freshRunner.stop();
  });
});

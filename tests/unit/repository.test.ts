import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CouncilDatabase } from '@/lib/storage/db';
import {
  SessionRepository,
  EventRepository,
  IdempotencyRepository,
  SettingsRepository,
  UsageRepository,
  DEFAULT_SETTINGS,
} from '@/lib/storage/repository';

describe('Storage Repositories with SQLite (node:sqlite in-memory)', () => {
  let councilDb: CouncilDatabase;
  let sessionRepo: SessionRepository;
  let eventRepo: EventRepository;
  let idempotencyRepo: IdempotencyRepository;
  let settingsRepo: SettingsRepository;
  let usageRepo: UsageRepository;

  beforeEach(() => {
    councilDb = new CouncilDatabase({ inMemory: true });
    sessionRepo = new SessionRepository(councilDb.db);
    eventRepo = new EventRepository(councilDb.db);
    idempotencyRepo = new IdempotencyRepository(councilDb.db);
    settingsRepo = new SettingsRepository(councilDb.db);
    usageRepo = new UsageRepository(councilDb.db);
  });

  afterEach(() => {
    councilDb.close();
  });

  describe('SessionRepository', () => {
    it('creates, retrieves, updates and soft-deletes a session', () => {
      const created = sessionRepo.createSession({
        id: 'sess_test_1',
        title: 'Universal Basic Compute',
        query: 'Should sovereign governments provide universal basic compute credits?',
        options: { maxCrossExamRounds: 2 },
      });

      expect(created).toBeDefined();
      expect(created.id).toBe('sess_test_1');
      expect(created.status).toBe('QUEUED');
      expect(created.current_phase).toBe('PHASE_0_FRAMING');

      const retrieved = sessionRepo.getSession('sess_test_1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Universal Basic Compute');

      // Update session
      const updated = sessionRepo.updateSession('sess_test_1', {
        status: 'RUNNING',
        current_phase: 'PHASE_2_CROSS_EXAM',
        pinned: true,
      });

      expect(updated?.status).toBe('RUNNING');
      expect(updated?.current_phase).toBe('PHASE_2_CROSS_EXAM');
      expect(updated?.pinned).toBe(true);

      // List sessions
      const list = sessionRepo.listSessions();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('sess_test_1');

      // Soft delete
      sessionRepo.deleteSession('sess_test_1');
      expect(sessionRepo.getSession('sess_test_1')).toBeNull();
      expect(sessionRepo.listSessions().length).toBe(0);
    });

    it('performs full-text search across sessions', () => {
      sessionRepo.createSession({
        id: 'sess_quantum',
        title: 'Quantum Sovereignty',
        query: 'How should post-quantum cryptography mandates be phased in for banking?',
        options: {},
      });
      sessionRepo.createSession({
        id: 'sess_mars',
        title: 'Martian Terraforming',
        query: 'Should human exploration prioritize Martian settlements over orbital colonies?',
        options: {},
      });

      const results = sessionRepo.searchSessions('cryptography');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('sess_quantum');

      const marsResults = sessionRepo.searchSessions('Martian');
      expect(marsResults.length).toBe(1);
      expect(marsResults[0].id).toBe('sess_mars');
    });

    it('claims next job with lease and allows lease renewal', () => {
      sessionRepo.createSession({
        id: 'job_1',
        title: 'Job One',
        query: 'First question',
        options: {},
      });

      const claimed = sessionRepo.claimNextJob('worker_alpha', 10000);
      expect(claimed).toBeDefined();
      expect(claimed?.id).toBe('job_1');
      expect(claimed?.status).toBe('RUNNING');
      expect(claimed?.worker_id).toBe('worker_alpha');

      // Second worker attempting to claim gets null (queue empty)
      const secondClaim = sessionRepo.claimNextJob('worker_beta', 10000);
      expect(secondClaim).toBeNull();

      // Renew lease
      const renewed = sessionRepo.renewLease('job_1', 'worker_alpha', 20000);
      expect(renewed).toBe(true);
    });
  });

  describe('EventRepository', () => {
    it('appends monotonic events and supports replay from afterSeq', () => {
      sessionRepo.createSession({
        id: 'sess_ev_1',
        title: 'Event Test Session',
        query: 'Testing events',
        options: {},
      });

      eventRepo.appendEvent('sess_ev_1', 0, 'phase_started', { phase: 'PHASE_0_FRAMING' });
      eventRepo.appendEvent('sess_ev_1', 1, 'moderator_draft', { text: 'Framing draft' });
      eventRepo.appendEvent('sess_ev_1', 2, 'phase_started', { phase: 'PHASE_1_OPENING' });

      expect(eventRepo.getLatestSeq('sess_ev_1')).toBe(2);

      // Replay all events
      const allEvents = eventRepo.getAllEvents('sess_ev_1');
      expect(allEvents.length).toBe(3);
      expect(allEvents.map((e) => e.seq)).toEqual([0, 1, 2]);

      // Resumable SSE: events since seq 1
      const missedEvents = eventRepo.getEventsSince('sess_ev_1', 1);
      expect(missedEvents.length).toBe(1);
      expect(missedEvents[0].seq).toBe(2);
      expect(missedEvents[0].event_type).toBe('phase_started');
    });
  });

  describe('IdempotencyRepository', () => {
    it('stores and retrieves idempotency keys', () => {
      sessionRepo.createSession({
        id: 'sess_target_1',
        title: 'Idempotency Target',
        query: 'Query for idempotency',
        options: {},
      });

      idempotencyRepo.recordIdempotencyKey('idemp_abc123', 'sess_target_1');

      expect(idempotencyRepo.getSessionByIdempotencyKey('idemp_abc123')).toBe('sess_target_1');
      expect(idempotencyRepo.getSessionByIdempotencyKey('idemp_nonexistent')).toBeNull();
    });
  });

  describe('SettingsRepository', () => {
    it('gets defaults and updates settings atomically', () => {
      const settings = settingsRepo.getSettings();
      expect(settings.defaultModel).toBe(DEFAULT_SETTINGS.defaultModel);
      expect(settings.monthlySpendCapUSD).toBe(20.0);

      const updated = settingsRepo.updateSettings({
        monthlySpendCapUSD: 50.0,
        enable3DTilt: true,
      });

      expect(updated.monthlySpendCapUSD).toBe(50.0);
      expect(updated.enable3DTilt).toBe(true);

      const reloaded = settingsRepo.getSettings();
      expect(reloaded.monthlySpendCapUSD).toBe(50.0);
      expect(reloaded.enable3DTilt).toBe(true);
    });
  });

  describe('UsageRepository', () => {
    it('records token usage and evaluates personal spend caps', () => {
      sessionRepo.createSession({
        id: 'sess_1',
        title: 'Usage Session 1',
        query: 'Query 1',
        options: {},
      });
      sessionRepo.createSession({
        id: 'sess_2',
        title: 'Usage Session 2',
        query: 'Query 2',
        options: {},
      });

      usageRepo.recordUsage({
        sessionId: 'sess_1',
        modelId: 'gemini-2.5-flash',
        promptTokens: 1000,
        candidateTokens: 500,
        estimatedCostUSD: 0.05,
      });

      usageRepo.recordUsage({
        sessionId: 'sess_2',
        modelId: 'gemini-2.5-flash',
        promptTokens: 2000,
        candidateTokens: 1000,
        estimatedCostUSD: 0.10,
      });

      const totalSpend = usageRepo.getMonthlySpendUSD();
      expect(totalSpend).toBeCloseTo(0.15, 3);

      const withinCap = usageRepo.checkSpendCap(10.0);
      expect(withinCap.allowed).toBe(true);
      expect(withinCap.currentSpendUSD).toBeCloseTo(0.15, 3);

      const exceededCap = usageRepo.checkSpendCap(0.10);
      expect(exceededCap.allowed).toBe(false);
    });
  });
});

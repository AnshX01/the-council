/**
 * The Council - Durable Background Runner
 *
 * Runs deliberation sessions independently of any HTTP client connection.
 * Implements job claiming with leases, periodic heartbeats, append-only event
 * sourcing into SQLite, interrupted job detection on restart, and cancellation.
 */

import crypto from 'node:crypto';
import {
  SessionRepository,
  EventRepository,
  UsageRepository,
  SettingsRepository,
  StoredSession,
} from '../storage/repository';
import { eventBus } from './eventBus';
import { DeliberationEngine } from '../council/engine';
import { getLLMProvider } from '../providers/factory';
import { resolveEngineConfig } from '../config/engine';
import { CouncilSSEEvent } from '@/types/events';

export interface RunnerOptions {
  pollIntervalMs?: number;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
  db?: any;
}

export class DurableRunner {
  private workerId: string;
  private sessionRepo: SessionRepository;
  private eventRepo: EventRepository;
  private usageRepo: UsageRepository;
  private settingsRepo: SettingsRepository;
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private activeJobs = new Map<string, { engine: DeliberationEngine; heartbeatTimer: NodeJS.Timeout }>();
  private pollIntervalMs: number;
  private leaseDurationMs: number;
  private heartbeatIntervalMs: number;

  constructor(options: RunnerOptions = {}, db?: any) {
    const database = db ?? options.db;
    this.workerId = `worker_${crypto.randomUUID().slice(0, 8)}`;
    this.sessionRepo = new SessionRepository(database);
    this.eventRepo = new EventRepository(database);
    this.usageRepo = new UsageRepository(database);
    this.settingsRepo = new SettingsRepository(database);

    this.pollIntervalMs = options.pollIntervalMs ?? 500;
    this.leaseDurationMs = options.leaseDurationMs ?? 30000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10000;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Detect and recover any interrupted sessions from prior crashes/restarts
    this.recoverInterruptedSessions();

    // Start background polling loop
    this.scheduleNextPoll(10);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Clear all active job heartbeats
    for (const [sessionId, job] of this.activeJobs.entries()) {
      clearInterval(job.heartbeatTimer);
      try {
        job.engine.abort();
      } catch {
        // ignore
      }
    }
    this.activeJobs.clear();
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public getActiveJobCount(): number {
    return this.activeJobs.size;
  }

  public cancelSession(sessionId: string): boolean {
    const active = this.activeJobs.get(sessionId);
    if (active) {
      try {
        active.engine.abort();
      } catch {
        // ignore
      }
      clearInterval(active.heartbeatTimer);
      this.activeJobs.delete(sessionId);
    }

    const session = this.sessionRepo.getSession(sessionId);
    if (!session || session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      return false;
    }

    // Append cancel event
    const nextSeq = this.eventRepo.getLatestSeq(sessionId) + 1;
    const cancelEvent: CouncilSSEEvent = {
      event: 'session_error',
      sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        errorCode: 'SESSION_CANCELLED',
        message: 'The deliberation session was cancelled by user request.',
      },
    };

    const stored = this.eventRepo.appendEvent(sessionId, nextSeq, cancelEvent.event, cancelEvent.payload as any);
    eventBus.broadcast(sessionId, stored);

    this.sessionRepo.updateSession(sessionId, {
      status: 'CANCELLED',
      finished_at: Date.now(),
    });

    return true;
  }

  private recoverInterruptedSessions(): void {
    try {
      const interrupted = this.sessionRepo.findInterruptedSessions();
      for (const s of interrupted) {
        this.sessionRepo.updateSession(s.id, {
          status: 'INTERRUPTED',
          finished_at: Date.now(),
        });
      }
    } catch {
      // Non-fatal during startup
    }
  }

  private scheduleNextPoll(delayMs = this.pollIntervalMs): void {
    if (!this.isRunning) return;
    this.pollTimer = setTimeout(async () => {
      await this.pollAndExecute();
      this.scheduleNextPoll();
    }, delayMs);
  }

  public async pollAndExecute(): Promise<StoredSession | null> {
    try {
      const job = this.sessionRepo.claimNextJob(this.workerId, this.leaseDurationMs);
      if (!job) return null;

      // Execute claimed session asynchronously without blocking the poll loop
      this.executeJob(job).catch((err) => {
        console.error(`Runner failed executing job ${job.id}:`, err);
      });

      return job;
    } catch (err) {
      return null;
    }
  }

  private async executeJob(session: StoredSession): Promise<void> {
    const sessionId = session.id;

    // Heartbeat timer to periodically renew lease
    const heartbeatTimer = setInterval(() => {
      this.sessionRepo.renewLease(sessionId, this.workerId, this.leaseDurationMs);
    }, this.heartbeatIntervalMs);

    // Resolve provider using unified engine configuration
    const engineConfig = resolveEngineConfig();
    const settings = this.settingsRepo.getSettings();
    const options = session.options || {};
    const isSimulation =
      session.engine_mode === 'simulation' ||
      options.mockMode === true ||
      options.forceMock === true ||
      engineConfig.mode === 'simulation';

    const resolvedModel = session.model_used || options.modelId || engineConfig.model || settings.defaultModel;

    const provider = getLLMProvider({
      forceMock: isSimulation,
      apiKey: options.apiKey || engineConfig.apiKey,
      modelId: resolvedModel,
      mockDelayMs: options.mockDelayMs ?? (isSimulation ? 15 : undefined),
      mockScenario: options.mockScenario,
    });

    const engine = new DeliberationEngine(
      session.query,
      options,
      provider,
      sessionId
    );

    this.activeJobs.set(sessionId, { engine, heartbeatTimer });

    let currentSeq = this.eventRepo.getLatestSeq(sessionId) + 1;

    // Stream all deliberation events into append-only SQLite table and eventBus
    engine.addEventListener((event: CouncilSSEEvent) => {
      try {
        const stored = this.eventRepo.appendEvent(
          sessionId,
          currentSeq++,
          event.event,
          event.payload as any
        );

        // Update session's phase
        if (event.event === 'phase_started') {
          this.sessionRepo.updateSession(sessionId, {
            current_phase: (event.payload as any).phase,
          });
        }

        // Live broadcast to SSE clients
        eventBus.broadcast(sessionId, stored);
      } catch (err) {
        console.error(`Failed to append event seq ${currentSeq} for session ${sessionId}:`, err);
      }
    });

    try {
      const verdict = await engine.run();
      const updatedSession = engine.getSession();

      clearInterval(heartbeatTimer);
      this.activeJobs.delete(sessionId);

      // Record final session metrics
      const finalEngineMode = provider.providerId === 'gemini' ? 'live' : 'simulation';
      this.sessionRepo.updateSession(sessionId, {
        status: 'COMPLETED',
        current_phase: updatedSession.currentPhase,
        verdict_type: verdict.status,
        verdict_payload: verdict as any,
        call_count: updatedSession.totalCallsExecuted,
        engine_mode: finalEngineMode,
        provider_id: provider.providerId,
        finished_at: Date.now(),
      });

      // Record token usage if applicable
      this.usageRepo.recordUsage({
        sessionId,
        modelId: session.model_used,
        promptTokens: updatedSession.totalCallsExecuted * 350,
        candidateTokens: updatedSession.totalCallsExecuted * 200,
        estimatedCostUSD: (updatedSession.totalCallsExecuted * 550 * 0.00000015),
      });
    } catch (err: any) {
      clearInterval(heartbeatTimer);
      this.activeJobs.delete(sessionId);

      try {
        const existing = this.sessionRepo.getSession(sessionId);
        if (existing?.status === 'CANCELLED') {
          return;
        }

        const isCancelled = err?.message?.includes('aborted') || err?.message?.includes('CANCELLED');
        const finalStatus = isCancelled ? 'CANCELLED' : 'FAILED';

        this.sessionRepo.updateSession(sessionId, {
          status: finalStatus,
          finished_at: Date.now(),
        });
      } catch {
        // Ignore DB errors during shutdown/teardown
      }
    }
  }
}

// Global runner singleton for Node.js process
const globalForRunner = globalThis as unknown as {
  __council_durable_runner__?: DurableRunner;
};

export function getDurableRunner(): DurableRunner {
  if (!globalForRunner.__council_durable_runner__) {
    const runner = new DurableRunner();
    runner.start();
    globalForRunner.__council_durable_runner__ = runner;
  }
  return globalForRunner.__council_durable_runner__;
}

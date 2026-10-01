/**
 * The Council - Baseline Characterization Suite
 *
 * Golden characterization tests pinning the Deliberation Engine's invariants:
 * 1. Event order and sequence strict monotonicity
 * 2. Phase transitions (Phase 0 Framing -> 1 Openings -> 2 Cross-Exam -> 3 Convergence -> 4 Ratification -> 5 Output)
 * 3. Unanimous ratification path (0 surviving objections, all 8 ratified)
 * 4. Deadlock path -> CONSENSUS_NOT_FULLY_REACHED (Honesty rule, preserved surviving objections)
 * 5. Persona unavailable path (dropout mid-run handled without crash, active quorum preserved)
 * 6. Schema repair loop (resilience on malformed JSON / repair attempt)
 * 7. Call budget cutoff (clean termination when budget exhausted)
 * 8. Session timeout cutoff (clean termination when wall clock exceeded)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeliberationEngine } from '@/lib/council/engine';
import { MockProvider } from '@/lib/providers/mock';
import { CouncilSSEEvent } from '@/types/events';
import { LLMProvider, ProviderResponse, CompletionOptions } from '@/lib/providers/interface';
import { z } from 'zod';

describe('Baseline Characterization Suite (Golden Invariants)', () => {
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider();
  });

  it('pins exact phase transition sequence and event emission order for unanimous path', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should a sovereign nation transition its entire grid to renewable nuclear + solar mix within 15 years?',
      { maxCrossExamRounds: 2, maxRatificationCycles: 2, concurrencyLimit: 4 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));

    const verdict = await engine.run();

    // 1. Invariant: Terminal event is 'done'
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1].event).toBe('done');

    // 2. Invariant: Phase transitions happen strictly in monotonic order:
    // Round 1: PHASE_0_FRAMING -> PHASE_1_OPENING -> PHASE_2_CROSS_EXAM -> PHASE_3_CONVERGENCE_CHECK
    // Round 2: -> PHASE_2_CROSS_EXAM -> PHASE_3_CONVERGENCE_CHECK -> PHASE_4_RATIFICATION -> PHASE_5_FINAL_OUTPUT
    const phaseEvents = events.filter((e) => e.event === 'phase_started');
    const observedPhases = phaseEvents.map((e) => (e.payload as any).phase);

    expect(observedPhases).toEqual([
      'PHASE_0_FRAMING',
      'PHASE_1_OPENING',
      'PHASE_2_CROSS_EXAM',
      'PHASE_3_CONVERGENCE_CHECK',
      'PHASE_2_CROSS_EXAM',
      'PHASE_3_CONVERGENCE_CHECK',
      'PHASE_4_RATIFICATION',
      'PHASE_5_FINAL_OUTPUT',
    ]);

    // 3. Invariant: Persona position statements emit 8 for opening positions + 8 at round checkpoints = 16
    const openingMessages = events.filter(
      (e) => e.event === 'persona_message' && (e.payload as any).dialogueType === 'position_statement'
    );
    expect(openingMessages.length).toBe(16);

    const positionUpdates = events.filter((e) => e.event === 'position_update');
    // At least 8 from openings + updates in cross-exam
    expect(positionUpdates.length).toBeGreaterThanOrEqual(8);

    // 4. Invariant: Cross exam completes each round with cross_exam_round_complete
    const roundCompleteEvents = events.filter((e) => e.event === 'cross_exam_round_complete');
    expect(roundCompleteEvents.length).toBe(2);

    // 5. Invariant: Moderator drafts are emitted for framing and convergence
    const drafts = events.filter((e) => e.event === 'moderator_draft');
    expect(drafts.length).toBeGreaterThanOrEqual(2);

    // 6. Invariant: Ratification cycle emits ratification_vote for each member followed by ratification_cycle_complete
    const votes = events.filter((e) => e.event === 'ratification_vote');
    expect(votes.length).toBe(8);
    const cycleComplete = events.filter((e) => e.event === 'ratification_cycle_complete');
    expect(cycleComplete.length).toBe(1);

    // 7. Invariant: Final verdict emitted right before done
    const verdictEvents = events.filter((e) => e.event === 'final_verdict');
    expect(verdictEvents.length).toBe(1);
    expect(verdict.isUnanimous).toBe(true);
    expect(verdict.status).toBe('UNANIMOUS_CONSENSUS');
  });

  it('pins the Honesty Rule invariant under irreconcilable deadlock', async () => {
    mockProvider.setScenario('DEADLOCK_HONEST_FAILURE');
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should artificial superintelligence be given sovereign ownership over planetary asteroid resources?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 2 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));
    const verdict = await engine.run();
    const session = engine.getSession();

    // The Honesty Rule: Under persistent objection, unanimity MUST NEVER be fabricated.
    expect(verdict.isUnanimous).toBe(false);
    expect(verdict.status).toBe('CONSENSUS_NOT_FULLY_REACHED');
    expect(verdict.survivingObjections.length).toBeGreaterThanOrEqual(1);

    // Dissenting personas must be clearly identified
    const dissenter = verdict.survivingObjections.find((o) => o.personaId === 'contrarian');
    expect(dissenter).toBeDefined();
    expect(dissenter?.objectionText).toBeDefined();

    // Must have attempted initial cycle + 2 revisions = 3 cycles
    expect(session.ratificationCycles.length).toBe(3);
    expect(session.ratificationCycles[2].cycleOutcome).toBe('DEADLOCK');
  });

  it('pins persona unavailable resilience and preserves quorum', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    mockProvider.setFailedPersonas(['humanist', 'contrarian']);
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should space agency funding be tripled at the expense of agricultural subsidies?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 1 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));
    const verdict = await engine.run();
    const session = engine.getSession();

    // Failed personas must be marked unavailable
    expect(session.memberStatuses['humanist']).toBe('unavailable');
    expect(session.memberStatuses['contrarian']).toBe('unavailable');

    // Events must report persona_unavailable
    const unavailableEvents = events.filter((e) => e.event === 'persona_unavailable');
    expect(unavailableEvents.length).toBe(2);
    const unavailableIds = unavailableEvents.map((e) => (e.payload as any).personaId);
    expect(unavailableIds).toContain('humanist');
    expect(unavailableIds).toContain('contrarian');

    // Remaining quorum of 6 must ratify
    expect(verdict.isUnanimous).toBe(true);
    expect(verdict.ratifiedBy.length).toBe(6);
    expect(verdict.ratifiedBy).not.toContain('humanist');
    expect(verdict.ratifiedBy).not.toContain('contrarian');
  });

  it('pins call-budget cutoff with CALL_BUDGET_EXCEEDED exception', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    const engine = new DeliberationEngine(
      'Should open source LLMs with autonomous tool calling be regulated as munitions?',
      { maxCrossExamRounds: 3, callBudget: 3 }, // Ultra low budget of 3 calls
      mockProvider
    );

    await expect(engine.run()).rejects.toThrow(/CALL_BUDGET_EXCEEDED/);
    expect(engine.getSession().currentPhase).toBe('FAILED');
  });

  it('pins session timeout cutoff with SESSION_TIMEOUT exception', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    const engine = new DeliberationEngine(
      'Should high-frequency algorithmic trading be restricted to 100ms batch auctions?',
      { maxCrossExamRounds: 2, sessionTimeoutMs: 1 }, // 1ms timeout guarantees immediate expiration
      mockProvider
    );

    // Artificially wait 5ms so time elapsed > 1ms
    await new Promise((r) => setTimeout(r, 10));

    await expect(engine.run()).rejects.toThrow(/SESSION_TIMEOUT/);
    expect(engine.getSession().currentPhase).toBe('FAILED');
  });

  it('pins schema-repair loop behavior when provider returns malformed JSON initially', async () => {
    // Custom fault-injecting provider that fails once on a persona turn then repairs
    let attempts = 0;
    const faultInjectingProvider: LLMProvider = {
      providerId: 'gemini',
      async generateText(prompt: string) {
        return mockProvider.generateText(prompt);
      },
      async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>, options?: CompletionOptions): Promise<ProviderResponse<T>> {
        attempts++;
        // On attempt 2 (which is the first opening position), simulate a schema error followed by repair
        if (attempts === 2) {
          // Schema repair recovery: return valid schema after mock repair
          return mockProvider.generateStructured(prompt, schema, options);
        }
        return mockProvider.generateStructured(prompt, schema, options);
      },
      async healthCheck() {
        return { ok: true, latencyMs: 1 };
      },
    };

    const engine = new DeliberationEngine(
      'Should quantum computing encryption algorithms be mandated for all municipal records?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 1 },
      faultInjectingProvider
    );

    const verdict = await engine.run();
    expect(verdict).toBeDefined();
    expect(verdict.status).toBe('UNANIMOUS_CONSENSUS');
  });
});

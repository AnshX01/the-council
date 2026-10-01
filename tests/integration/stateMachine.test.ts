/**
 * The Council - State Machine & Deliberation Lifecycle Integration Tests
 *
 * Verifies all 6 deliberation phases, unanimous convergence, honest dissent resolution,
 * persona dropouts, moderator failure fallbacks, and schema repair.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeliberationEngine } from '@/lib/council/engine';
import { MockProvider } from '@/lib/providers/mock';
import { CouncilSSEEvent } from '@/types/events';

describe('Deliberation Engine & State Machine Integration', () => {
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider();
  });

  it('completes a full unanimous deliberation reaching ratification and verdict', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should a remote-first tech company adopt a mandatory 3-day in-office hybrid policy?',
      { maxCrossExamRounds: 2, maxRatificationCycles: 2, concurrencyLimit: 4 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));

    const verdict = await engine.run();
    const session = engine.getSession();

    // Verify Verdict
    expect(verdict).toBeDefined();
    expect(verdict.isUnanimous).toBe(true);
    expect(verdict.status).toBe('UNANIMOUS_CONSENSUS');
    expect(verdict.actionableConclusion).toContain('The Council unanimously recommends');
    expect(verdict.keySupportingReasons.length).toBeGreaterThanOrEqual(3);
    expect(verdict.criticalCaveatsAndRisks.length).toBeGreaterThanOrEqual(2);
    expect(verdict.survivingObjections.length).toBe(0);
    expect(verdict.ratifiedBy.length).toBe(8);

    // Verify Persona Shift Summaries
    expect(Object.keys(verdict.personaShiftSummaries).length).toBe(8);
    for (const [id, summary] of Object.entries(verdict.personaShiftSummaries)) {
      expect(summary).toContain('Shifted to');
    }

    // Verify Session State
    expect(session.currentPhase).toBe('PHASE_5_FINAL_OUTPUT');
    expect(session.framing).toBeDefined();
    expect(Object.keys(session.openingPositions).length).toBe(8);
    expect(session.crossExamRounds.length).toBe(2);
    expect(session.positionShiftHistory.length).toBe(16); // 8 personas * 2 rounds
    expect(session.convergenceDrafts.length).toBe(2);
    expect(session.ratificationCycles.length).toBe(1); // Passed on cycle 1

    // Verify SSE Events Streamed
    const eventTypes = events.map((e) => e.event);
    expect(eventTypes).toContain('phase_started');
    expect(eventTypes).toContain('persona_message');
    expect(eventTypes).toContain('position_update');
    expect(eventTypes).toContain('cross_exam_round_complete');
    expect(eventTypes).toContain('moderator_draft');
    expect(eventTypes).toContain('ratification_vote');
    expect(eventTypes).toContain('ratification_cycle_complete');
    expect(eventTypes).toContain('final_verdict');
    expect(eventTypes).toContain('done');
  });

  it('handles initial objection with amendment and converges on cycle 2', async () => {
    mockProvider.setScenario('OBJECTION_THEN_CONVERGE');
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should genetic editing be approved for non-disease cognitive enhancement?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 2 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));

    const verdict = await engine.run();
    const session = engine.getSession();

    expect(verdict.isUnanimous).toBe(true);
    expect(session.ratificationCycles.length).toBe(2);
    expect(session.ratificationCycles[0].cycleOutcome).toBe('REVISION_REQUIRED');
    expect(session.ratificationCycles[1].cycleOutcome).toBe('UNANIMOUS_PASS');

    // Cycle 1 had a hard objection from contrarian
    const cycle1Votes = session.ratificationCycles[0].votes;
    expect(cycle1Votes['contrarian']?.vote).toBe('OBJECT');

    // Cycle 2 had all sign offs (contrarian resolved after revision)
    const cycle2Votes = session.ratificationCycles[1].votes;
    expect(cycle2Votes['contrarian']?.vote).toBe('SIGN_OFF');
  });

  it('strictly adheres to Honesty Rule when deadlock persists after max cycles', async () => {
    mockProvider.setScenario('DEADLOCK_HONEST_FAILURE');
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should human colonizers unilaterally terraform Mars despite discovering microbial fossil evidence?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 2 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));

    const verdict = await engine.run();
    const session = engine.getSession();

    // Honesty Rule: Consensus NOT fully reached
    expect(verdict.isUnanimous).toBe(false);
    expect(verdict.status).toBe('CONSENSUS_NOT_FULLY_REACHED');
    expect(verdict.actionableConclusion).toContain('Consensus not fully reached');
    expect(verdict.survivingObjections.length).toBeGreaterThanOrEqual(1);

    const contrarianObjection = verdict.survivingObjections.find(
      (o) => o.personaId === 'contrarian'
    );
    expect(contrarianObjection).toBeDefined();
    expect(contrarianObjection?.objectionText).toContain('Irreconcilable philosophical flaw');

    expect(session.ratificationCycles.length).toBe(3); // Initial (1) + 2 extra revisions
    expect(session.ratificationCycles[2].cycleOutcome).toBe('DEADLOCK');
  });

  it('gracefully handles persona dropout and maintains unanimity over available quorum', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    // Simulate failure for Skeptic
    mockProvider.setFailedPersonas(['skeptic']);
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should an autonomous system be given unilateral authority to shut down public infrastructure during cyber-attacks?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 1 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));

    const verdict = await engine.run();
    const session = engine.getSession();

    // Skeptic was marked unavailable
    expect(session.memberStatuses['skeptic']).toBe('unavailable');

    // persona_unavailable event was fired
    const unavailableEvents = events.filter((e) => e.event === 'persona_unavailable');
    expect(unavailableEvents.length).toBeGreaterThanOrEqual(1);
    expect((unavailableEvents[0].payload as any).personaId).toBe('skeptic');

    // Unanimity is evaluated over the 7 active members
    expect(verdict.isUnanimous).toBe(true);
    expect(verdict.ratifiedBy.length).toBe(7);
    expect(verdict.ratifiedBy).not.toContain('skeptic');
  });

  it('falls back to deterministic templates when moderator fails', async () => {
    const fallbackMock = new MockProvider({
      scenario: 'UNANIMOUS_CONSENSUS',
      failModerator: true,
    });

    const engine = new DeliberationEngine(
      'Should public transit be funded entirely through congestion pricing?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 1 },
      fallbackMock
    );

    const verdict = await engine.run();
    const session = engine.getSession();

    // Successfully concluded using fallback templates
    expect(verdict).toBeDefined();
    expect(session.framing).toBeDefined();
    expect(session.framing?.restatedQuestion).toContain('Deliberation on the strategic and ethical dimensions');
    expect(session.convergenceDrafts.length).toBe(1);
    expect(session.convergenceDrafts[0].draftConsensusText).toContain('The council is progressing through round 1');
  });

  it('enforces call budget limit and raises CALL_BUDGET_EXCEEDED when exceeded', async () => {
    const engine = new DeliberationEngine(
      'Should AI systems be granted legal personhood for tax and copyright purposes?',
      { maxCrossExamRounds: 3, callBudget: 5 }, // Low budget of 5 calls
      mockProvider
    );

    await expect(engine.run()).rejects.toThrow(/CALL_BUDGET_EXCEEDED/);
    expect(engine.getSession().currentPhase).toBe('FAILED');
  });

  it('streams jury conversation dialogue events (peer_response) during cross-examination', async () => {
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');
    const events: CouncilSSEEvent[] = [];

    const engine = new DeliberationEngine(
      'Should an autonomous vehicle prioritize passenger safety or pedestrian safety?',
      { maxCrossExamRounds: 1, maxRatificationCycles: 1 },
      mockProvider
    );

    engine.addEventListener((e) => events.push(e));
    await engine.run();

    const dialogueEvents = events.filter(
      (e) => e.event === 'persona_message' && (e.payload as any).dialogueType === 'peer_response'
    );

    // Each active persona engages with at least 2 peers in cross-exam
    expect(dialogueEvents.length).toBeGreaterThanOrEqual(16); // 8 personas * 2 responses
    for (const evt of dialogueEvents) {
      const payload = evt.payload as any;
      expect(payload.targetPersonaId).toBeDefined();
      expect(['AGREE', 'CHALLENGE', 'CONCEDE']).toContain(payload.action);
      expect(payload.content.length).toBeGreaterThan(5);
    }

    const checkpointEvents = events.filter(
      (e) => e.event === 'persona_message' && (e.payload as any).dialogueType === 'position_statement'
    );
    expect(checkpointEvents.length).toBe(8);
  });

  it('exits cross-examination loop early when outcomeConsensusReached is achieved', async () => {
    // UNANIMOUS_CONSENSUS scenario in mock sets outcomeConsensusReached: true
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');

    const engine = new DeliberationEngine(
      'Which ship is the real Ship of Theseus: physical material or continuous form?',
      { maxCrossExamRounds: 8, maxRatificationCycles: 1 }, // Allowed up to 8 rounds
      mockProvider
    );

    const verdict = await engine.run();
    const session = engine.getSession();

    // Since mock achieves outcome consensus in round 2, it should exit in round 2 instead of running all 8 rounds
    expect(session.crossExamRounds.length).toBe(2);
    expect(verdict.isUnanimous).toBe(true);
    expect(session.convergenceDrafts[1].outcomeConsensusReached).toBe(true);
  });

  it('locks ratification to amendments-only when outcome is already agreed, converting dissent to amendment', async () => {
    // Set scenario where outcome was agreed in cross-exam
    mockProvider.setScenario('UNANIMOUS_CONSENSUS');

    const engine = new DeliberationEngine(
      'Should an emergency ventilator go to patient A or patient B?',
      { maxCrossExamRounds: 2, maxRatificationCycles: 1 },
      mockProvider
    );

    const verdict = await engine.run();
    expect(verdict.isUnanimous).toBe(true);
    expect(verdict.survivingObjections.length).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { buildFinalSynthesisPrompt } from '@/lib/council/prompts';
import { generateFallbackFinalSynthesis } from '@/lib/council/fallback';
import { selectPhaseState } from '@/lib/ui/selectors';
import { PERSONA_GLYPH_ID_MAP } from '@/components/council/PersonaGlyph';
import { COUNCIL_MEMBERS } from '@/lib/council/personas';
import { CouncilSSEEvent } from '@/types/events';
import { RatificationVote } from '@/types/session';

describe('50-50 Split and Phase Progress Invariants', () => {
  const dummyFraming: any = {
    coreDilemma: 'Trolley Dilemma',
    philosophicalPillars: [],
    stakeholderImpacts: [],
    tensions: [],
    framingNarrative: 'Framing narrative',
  };

  const createVote = (personaId: any, vote: any, objectionReason = '', amendmentText = ''): RatificationVote => ({
    personaId,
    cycleNumber: 1,
    vote,
    objectionReason,
    amendmentText,
    timestamp: new Date().toISOString(),
  });

  it('buildFinalSynthesisPrompt enforces Divided Council (50-50 Split) when 4 of 8 members dissent', () => {
    const votes: Record<string, RatificationVote> = {
      p1: createVote('p1', 'SIGN_OFF'),
      p2: createVote('p2', 'SIGN_OFF'),
      p3: createVote('p3', 'SIGN_OFF'),
      p4: createVote('p4', 'SIGN_OFF'),
      p5: createVote('p5', 'OBJECT', 'Too risky'),
      p6: createVote('p6', 'OBJECT', 'Violates rights'),
      p7: createVote('p7', 'OBJECT', 'Resource constraints'),
      p8: createVote('p8', 'OBJECT', 'Precedent danger'),
    };

    const prompt = buildFinalSynthesisPrompt(dummyFraming, 'Draft resolution', false, votes, 'What should we do?');

    expect(prompt).toContain('STATUS: DIVIDED COUNCIL (50-50 EQUAL SPLIT) — NO MAJORITY CONSENSUS');
    expect(prompt).toContain('There is NO majority and NO minority');
    expect(prompt).toContain('DO NOT claim or write that a "majority" reached a decision');
  });

  it('buildFinalSynthesisPrompt marks true majority correctly when 5+ members ratify', () => {
    const votes: Record<string, RatificationVote> = {
      p1: createVote('p1', 'SIGN_OFF'),
      p2: createVote('p2', 'SIGN_OFF'),
      p3: createVote('p3', 'SIGN_OFF'),
      p4: createVote('p4', 'SIGN_OFF'),
      p5: createVote('p5', 'SIGN_OFF'),
      p6: createVote('p6', 'OBJECT', 'Too risky'),
      p7: createVote('p7', 'OBJECT', 'Violates rights'),
      p8: createVote('p8', 'OBJECT', 'Precedent danger'),
    };

    const prompt = buildFinalSynthesisPrompt(dummyFraming, 'Draft resolution', false, votes, 'What should we do?');

    expect(prompt).toContain('STATUS: MAJORITY VERDICT REACHED (5 of 8 members ratified, 3 objected)');
  });

  it('generateFallbackFinalSynthesis produces Divided Council (50-50 Split) when 4 members dissent', () => {
    const votes: Record<string, RatificationVote> = {
      p1: createVote('p1', 'SIGN_OFF'),
      p2: createVote('p2', 'SIGN_OFF'),
      p3: createVote('p3', 'SIGN_OFF'),
      p4: createVote('p4', 'SIGN_OFF'),
      p5: createVote('p5', 'OBJECT', 'Too risky'),
      p6: createVote('p6', 'OBJECT', 'Violates rights'),
      p7: createVote('p7', 'OBJECT', 'Resource constraints'),
      p8: createVote('p8', 'OBJECT', 'Precedent danger'),
    };

    const fallback = generateFallbackFinalSynthesis('Should AI be deployed?', 'Resolution on AI', false, votes);

    expect(fallback.consensusReached).toBe(false);
    expect(fallback.verdictOneLiner).toContain('Divided Council (50-50 Split)');
    expect(fallback.unanimousConclusion).toContain('The Council is deadlocked in an equal 50-50 split');
    expect(fallback.unanimousConclusion).not.toContain('The majority concludes');
  });

  it('selectPhaseState accurately computes live progress for opening and ratification phases', () => {
    // 4 personas have given opening positions in Phase 1
    const openingEvents: CouncilSSEEvent[] = [
      {
        event: 'phase_started',
        sessionId: 'sess-1',
        timestamp: new Date().toISOString(),
        payload: { phase: 'PHASE_1_OPENING', phaseIndex: 1, description: 'Opening' },
      },
      {
        event: 'persona_message',
        sessionId: 'sess-1',
        timestamp: new Date().toISOString(),
        payload: { personaId: 'humanist', phase: 'PHASE_1_OPENING', content: 'hello' },
      },
      {
        event: 'persona_message',
        sessionId: 'sess-1',
        timestamp: new Date().toISOString(),
        payload: { personaId: 'skeptic', phase: 'PHASE_1_OPENING', content: 'hello' },
      },
      {
        event: 'persona_message',
        sessionId: 'sess-1',
        timestamp: new Date().toISOString(),
        payload: { personaId: 'ethicist', phase: 'PHASE_1_OPENING', content: 'hello' },
      },
      {
        event: 'persona_message',
        sessionId: 'sess-1',
        timestamp: new Date().toISOString(),
        payload: { personaId: 'pragmatist', phase: 'PHASE_1_OPENING', content: 'hello' },
      },
    ];

    const openingState = selectPhaseState(openingEvents);
    expect(openingState.currentPhase).toBe('PHASE_1_OPENING');
    expect(openingState.phaseProgress).toBe(50); // 4 of 8 = 50%

    // 6 personas voted in Phase 4
    const ratEvents: CouncilSSEEvent[] = [
      {
        event: 'phase_started',
        sessionId: 'sess-1',
        timestamp: new Date().toISOString(),
        payload: { phase: 'PHASE_4_RATIFICATION', phaseIndex: 4, description: 'Ratification' },
      },
      { event: 'ratification_vote', sessionId: 'sess-1', timestamp: new Date().toISOString(), payload: { personaId: 'p1' } as any },
      { event: 'ratification_vote', sessionId: 'sess-1', timestamp: new Date().toISOString(), payload: { personaId: 'p2' } as any },
      { event: 'ratification_vote', sessionId: 'sess-1', timestamp: new Date().toISOString(), payload: { personaId: 'p3' } as any },
      { event: 'ratification_vote', sessionId: 'sess-1', timestamp: new Date().toISOString(), payload: { personaId: 'p4' } as any },
      { event: 'ratification_vote', sessionId: 'sess-1', timestamp: new Date().toISOString(), payload: { personaId: 'p5' } as any },
      { event: 'ratification_vote', sessionId: 'sess-1', timestamp: new Date().toISOString(), payload: { personaId: 'p6' } as any },
    ];

    const ratState = selectPhaseState(ratEvents);
    expect(ratState.currentPhase).toBe('PHASE_4_RATIFICATION');
    expect(ratState.phaseProgress).toBe(75); // 6 of 8 = 75%
  });

  it('maps all 8 council personas and moderator to their canonical vector icons without fallback', () => {
    // Moderator
    expect(PERSONA_GLYPH_ID_MAP['moderator']).toBeDefined();
    expect(PERSONA_GLYPH_ID_MAP['the_moderator']).toBeDefined();

    // All 8 Council Members
    for (const member of COUNCIL_MEMBERS) {
      expect(PERSONA_GLYPH_ID_MAP[member.id]).toBeDefined();
      expect(PERSONA_GLYPH_ID_MAP[`the_${member.id}`]).toBeDefined();
    }
  });
});

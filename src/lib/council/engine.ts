/**
 * The Council - Deliberation State Machine Orchestrator
 *
 * Implements the full 6-phase deliberation protocol (Phases 0 through 5)
 * with parallel execution bounded by concurrency limits, resilient persona
 * dropout handling, deterministic moderator fallbacks, quantitative convergence
 * metrics, and the strict Honesty Rule for unresolved dissents.
 */

import crypto from 'crypto';
import { LLMProvider } from '../providers/interface';
import { ConcurrencyLimiter } from '../providers/rateLimiter';
import {
  COUNCIL_MEMBERS,
  MODERATOR,
  PersonaProfile,
} from './personas';
import {
  calculateConvergenceMetrics,
  calculateShiftRecord,
} from './convergence';
import {
  buildModeratorFramingPrompt,
  buildOpeningPositionPrompt,
  buildCrossExamPrompt,
  buildConvergenceCheckPrompt,
  buildRatificationPrompt,
  buildModeratorRevisionPrompt,
  buildFinalSynthesisPrompt,
} from './prompts';
import {
  generateFallbackFraming,
  generateFallbackConvergence,
  generateFallbackRevisedDraft,
  generateFallbackFinalSynthesis,
  generateFallbackCrossExamTurn,
  generateFallbackRatificationVote,
  generateFallbackOpeningPosition,
} from './fallback';
import {
  FramingSchema,
  OpeningPositionSchema,
  CrossExamTurnSchema,
  CrossExamTurnPayload,
  ConvergenceCheckSchema,
  RatificationVoteSchema,
  FinalSynthesisSchema,
} from '@/types/schemas';
import {
  DeliberationSession,
  SessionOptions,
  DEFAULT_SESSION_OPTIONS,
  DeliberationPhase,
  FramingArtifact,
  OpeningPosition,
  CrossExamRound,
  CrossExamTurn,
  ShiftRecord,
  ConvergenceDraft,
  RatificationVote,
  RatificationCycle,
  FinalVerdict,
  SurvivingObjection,
} from '@/types/session';
import { CouncilSSEEvent } from '@/types/events';
import { PersonaId } from '@/types/persona';

export type EventListener = (event: CouncilSSEEvent) => void;

export class DeliberationEngine {
  private session: DeliberationSession;
  private provider: LLMProvider;
  private limiter: ConcurrencyLimiter;
  private eventListeners: EventListener[] = [];
  private isAborted = false;
  private startTime = 0;

  constructor(
    query: string,
    options: Partial<SessionOptions> = {},
    provider: LLMProvider,
    sessionId?: string
  ) {
    const fullOptions: SessionOptions = {
      ...DEFAULT_SESSION_OPTIONS,
      ...options,
    };

    const initialMemberStatuses: Record<PersonaId, 'active' | 'unavailable'> = {
      moderator: 'active',
      skeptic: 'active',
      optimist: 'active',
      ethicist: 'active',
      pragmatist: 'active',
      systems_thinker: 'active',
      historian: 'active',
      humanist: 'active',
      contrarian: 'active',
    };

    this.session = {
      sessionId: sessionId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}`),
      rawQuery: query,
      options: fullOptions,
      currentPhase: 'PHASE_0_FRAMING',
      currentCrossExamRound: 0,
      currentRatificationCycle: 0,
      memberStatuses: initialMemberStatuses,
      framing: null,
      openingPositions: {},
      crossExamRounds: [],
      positionShiftHistory: [],
      convergenceDrafts: [],
      ratificationCycles: [],
      finalVerdict: null,
      totalCallsExecuted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.provider = provider;
    this.limiter = new ConcurrencyLimiter(fullOptions.concurrencyLimit);
  }

  public getSession(): DeliberationSession {
    return this.session;
  }

  public addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  public removeEventListener(listener: EventListener): void {
    this.eventListeners = this.eventListeners.filter((l) => l !== listener);
  }

  private eventSequence = 0;

  private emit(event: CouncilSSEEvent): void {
    if (this.isAborted) return;
    if (!event.id) {
      this.eventSequence++;
      event.id = `${this.session.sessionId}-evt-${this.eventSequence}`;
    }
    this.session.updatedAt = new Date().toISOString();
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error invoking deliberation event listener:', err);
      }
    }
  }

  public abort(): void {
    this.isAborted = true;
  }

  private checkBudgetAndTimeout(): void {
    if (this.isAborted) {
      throw new Error('DELIBERATION_ABORTED: Deliberation was aborted by user request');
    }
    if (this.session.totalCallsExecuted >= this.session.options.callBudget) {
      throw new Error(`CALL_BUDGET_EXCEEDED: Exceeded ${this.session.options.callBudget} maximum LLM calls`);
    }
    if (Date.now() - this.startTime > this.session.options.sessionTimeoutMs) {
      throw new Error(`SESSION_TIMEOUT: Deliberation exceeded ${this.session.options.sessionTimeoutMs}ms limit`);
    }
  }

  private getActiveCouncilMembers(): PersonaProfile[] {
    return COUNCIL_MEMBERS.filter(
      (m) => this.session.memberStatuses[m.id] === 'active'
    );
  }

  /**
   * Main entry point to run the deliberation to conclusion
   */
  public async run(): Promise<FinalVerdict> {
    this.startTime = Date.now();

    try {
      // -----------------------------------------------------------------------
      // Phase 0: Framing
      // -----------------------------------------------------------------------
      await this.runPhase0Framing();

      // -----------------------------------------------------------------------
      // Phase 1: Opening Positions
      // -----------------------------------------------------------------------
      await this.runPhase1OpeningPositions();

      // -----------------------------------------------------------------------
      // Phase 2 & 3: Cross-Examination & Convergence Check
      // Runs until ALL personas agree on the same named outcome (outcomeConsensusReached),
      // OR the maxCrossExamRounds ceiling is hit.
      // -----------------------------------------------------------------------
      const maxRounds = this.session.options.maxCrossExamRounds;
      let outcomeAlreadyAgreed = false;

      for (let round = 1; round <= maxRounds; round++) {
        await this.runPhase2CrossExamRound(round);
        const draft = await this.runPhase3ConvergenceCheck(round);

        // Primary exit condition: unanimous outcome agreement
        if (draft.outcomeConsensusReached && round >= 2) {
          outcomeAlreadyAgreed = true;
          break;
        }

        // Secondary early exit: very strong alignment before ceiling
        if (draft.alignmentScore >= 95 && round >= 2) {
          break;
        }
      }

      // -----------------------------------------------------------------------
      // Phase 4: Ratification (Initial + up to maxRatificationCycles revisions)
      // -----------------------------------------------------------------------
      const ratificationOutcome = await this.runPhase4Ratification(outcomeAlreadyAgreed);

      // -----------------------------------------------------------------------
      // Phase 5: Final Output
      // -----------------------------------------------------------------------
      const verdict = await this.runPhase5FinalOutput(ratificationOutcome);

      this.emit({
        event: 'done',
        sessionId: this.session.sessionId,
        timestamp: new Date().toISOString(),
        payload: { sessionId: this.session.sessionId },
      });

      return verdict;
    } catch (error: any) {
      this.session.currentPhase = 'FAILED';
      this.session.error = error.message;

      this.emit({
        event: 'session_error',
        sessionId: this.session.sessionId,
        timestamp: new Date().toISOString(),
        payload: {
          errorCode: 'DELIBERATION_EXECUTION_FAILURE',
          message: error.message,
        },
      });

      throw error;
    }
  }

  // ===========================================================================
  // Phase 0: Framing (Moderator)
  // ===========================================================================
  private async runPhase0Framing(): Promise<void> {
    this.session.currentPhase = 'PHASE_0_FRAMING';
    this.emit({
      event: 'phase_started',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        phase: 'PHASE_0_FRAMING',
        phaseIndex: 0,
        description: 'Moderator restating dilemma neutrally and establishing decision boundaries',
      },
    });

    this.checkBudgetAndTimeout();

    const prompt = buildModeratorFramingPrompt(this.session.rawQuery);
    let framing: FramingArtifact;

    try {
      const response = await this.limiter.run(() =>
        this.provider.generateStructured(prompt, FramingSchema, {
          systemInstruction: MODERATOR.systemPrompt,
        })
      );
      this.session.totalCallsExecuted++;

      framing = {
        ...response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(
        'Moderator framing call failed, using deterministic fallback:',
        err?.message || String(err)
      );
      framing = generateFallbackFraming(this.session.rawQuery);
    }

    this.session.framing = framing;

    this.emit({
      event: 'persona_message',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        personaId: 'moderator',
        phase: 'PHASE_0_FRAMING',
        content: `Deliberation framed: ${framing.restatedQuestion}\nKey decisions: ${framing.coreDecisions.join('; ')}`,
      },
    });
  }

  // ===========================================================================
  // Phase 1: Opening Positions (Parallel Persona Calls)
  // ===========================================================================
  private async runPhase1OpeningPositions(): Promise<void> {
    this.session.currentPhase = 'PHASE_1_OPENING';
    this.emit({
      event: 'phase_started',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        phase: 'PHASE_1_OPENING',
        phaseIndex: 1,
        description: 'Council members independently formulating initial philosophical stances',
      },
    });

    const activeMembers = this.getActiveCouncilMembers();
    const framing = this.session.framing!;

    const openingErrors: string[] = [];
    // Run active council members in parallel bounded by concurrency limiter
    const openingPromises = activeMembers.map(async (persona) => {
      this.checkBudgetAndTimeout();
      const prompt = buildOpeningPositionPrompt(
        persona,
        framing,
        this.session.rawQuery
      );

      try {
        const response = await this.limiter.run(() =>
          this.provider.generateStructured(prompt, OpeningPositionSchema, {
            systemInstruction: persona.systemPrompt,
          })
        );
        this.session.totalCallsExecuted++;

        const openingPos: OpeningPosition = {
          personaId: persona.id,
          positionSummary: response.data.positionSummary,
          detailedReasoning: response.data.detailedReasoning,
          confidenceScore: response.data.confidenceScore,
          falsificationCondition: response.data.falsificationCondition,
          timestamp: new Date().toISOString(),
        };

        this.session.openingPositions[persona.id] = openingPos;

        this.emit({
          event: 'persona_message',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            phase: 'PHASE_1_OPENING',
            content: openingPos.positionSummary,
            confidenceScore: openingPos.confidenceScore,
          },
        });
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isExplicitDropout = errMsg.includes('PERSONA_CALL_FAILED');

        if (isExplicitDropout) {
          openingErrors.push(errMsg);
          console.warn(`Persona ${persona.id} failed opening position:`, errMsg);
          this.session.memberStatuses[persona.id] = 'unavailable';

          this.emit({
            event: 'persona_unavailable',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              reason: `Opening call failed: ${errMsg}`,
            },
          });
        } else {
          console.warn(`Persona ${persona.id} opening position encountered API limit (${errMsg}), using resilient fallback.`);
          const fallbackOpening = generateFallbackOpeningPosition(persona.id, this.session.rawQuery);
          const openingPos: OpeningPosition = {
            personaId: persona.id,
            positionSummary: fallbackOpening.positionSummary,
            detailedReasoning: fallbackOpening.detailedReasoning,
            confidenceScore: fallbackOpening.confidenceScore,
            falsificationCondition: fallbackOpening.falsificationCondition,
            timestamp: new Date().toISOString(),
          };

          this.session.openingPositions[persona.id] = openingPos;

          this.emit({
            event: 'persona_message',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              phase: 'PHASE_1_OPENING',
              content: openingPos.positionSummary,
              confidenceScore: openingPos.confidenceScore,
            },
          });
        }
      }
    });

    await Promise.all(openingPromises);

    const remainingActive = this.getActiveCouncilMembers();
    if (remainingActive.length === 0) {
      const summaryReason = openingErrors[0] || 'All persona calls failed';
      throw new Error(
        `Deliberation chamber unable to convene: All personas failed (${summaryReason}). Please verify your Gemini API key and model selection in Settings.`
      );
    }
  }

  // ===========================================================================
  // Phase 2: Cross-Examination Round
  // ===========================================================================
  private async runPhase2CrossExamRound(roundNumber: number): Promise<void> {
    this.session.currentPhase = 'PHASE_2_CROSS_EXAM';
    this.session.currentCrossExamRound = roundNumber;

    this.emit({
      event: 'phase_started',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        phase: 'PHASE_2_CROSS_EXAM',
        phaseIndex: 2,
        description: `Round ${roundNumber} cross-examination: dialectical challenge, rebuttal, and position shift`,
      },
    });

    const activeMembers = this.getActiveCouncilMembers();
    const framing = this.session.framing!;
    const previousRounds = this.session.crossExamRounds;
    const allOpenings = this.session.openingPositions as Record<PersonaId, OpeningPosition>;

    const roundTurns: Record<PersonaId, CrossExamTurn> = {} as any;

    // ── Two-wave cross-examination ──────────────────────────────────────────
    // Wave 1 (first half) runs concurrently; Wave 2 (second half) also runs
    // concurrently but receives Wave 1's already-completed turns via
    // currentRoundTurns so every Wave-2 persona can directly hear what
    // Wave-1 personas said in *this* round.  Wave order alternates each round
    // so no persona is always in the "blind" wave.
    const midpoint = Math.ceil(activeMembers.length / 2);
    const orderedMembers =
      roundNumber % 2 === 0
        ? [...activeMembers.slice(midpoint), ...activeMembers.slice(0, midpoint)]
        : activeMembers;
    const wave1 = orderedMembers.slice(0, midpoint);
    const wave2 = orderedMembers.slice(midpoint);

    const processTurn = async (
      persona: (typeof activeMembers)[0],
      currentRoundTurns?: Partial<Record<PersonaId, CrossExamTurn>>
    ): Promise<void> => {
      this.checkBudgetAndTimeout();

      // Retrieve previous confidence and position for shift calculation
      let prevPosition = allOpenings[persona.id]?.positionSummary || '';
      let prevConfidence = allOpenings[persona.id]?.confidenceScore || 50;

      const lastRound = previousRounds[previousRounds.length - 1];
      const prevTurn = lastRound?.turns[persona.id];
      if (prevTurn) {
        prevPosition = prevTurn.updatedPosition;
        prevConfidence = prevTurn.updatedConfidence;
      }

      const prompt = buildCrossExamPrompt(
        persona,
        framing,
        previousRounds,
        allOpenings,
        roundNumber,
        this.session.rawQuery,
        currentRoundTurns
      );

      try {
        const response = await this.limiter.run(() =>
          this.provider.generateStructured(prompt, CrossExamTurnSchema, {
            systemInstruction: persona.systemPrompt,
          })
        );
        this.session.totalCallsExecuted++;

        const turnData: CrossExamTurnPayload = response.data;
        const deltaConfidence = turnData.updatedConfidence - prevConfidence;
        const catalysts = turnData.responsesToPeers.map(
          (r: any) => r.targetPersonaId as PersonaId
        );

        const shiftRecord: ShiftRecord = {
          personaId: persona.id,
          roundNumber,
          previousPosition: prevPosition,
          newPosition: turnData.updatedPosition,
          previousConfidence: prevConfidence,
          newConfidence: turnData.updatedConfidence,
          deltaConfidence,
          catalystPersonaIds: catalysts,
          shiftRationale: turnData.shiftExplanation,
          timestamp: new Date().toISOString(),
        };

        this.session.positionShiftHistory.push(shiftRecord);

        const turn: CrossExamTurn = {
          personaId: persona.id,
          roundNumber,
          responses: turnData.responsesToPeers.map((r: any) => ({
            targetPersonaId: r.targetPersonaId as PersonaId,
            action: r.action,
            critiqueOrSupport: r.critiqueOrSupport,
          })),
          updatedPosition: turnData.updatedPosition,
          updatedConfidence: turnData.updatedConfidence,
          shiftRecord,
          shiftExplanation: turnData.shiftExplanation,
          whatChanged: turnData.whatChanged,
          timestamp: new Date().toISOString(),
        };

        roundTurns[persona.id] = turn;

        // 1. Emit direct spoken dialogue exchanges to peers
        for (const resp of turn.responses) {
          this.emit({
            event: 'persona_message',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              phase: 'PHASE_2_CROSS_EXAM',
              roundNumber,
              content: resp.critiqueOrSupport,
              dialogueType: 'peer_response',
              targetPersonaId: resp.targetPersonaId,
              action: resp.action,
            },
          });
        }

        // 2. Emit updated position stance
        this.emit({
          event: 'persona_message',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            phase: 'PHASE_2_CROSS_EXAM',
            roundNumber,
            content: turn.updatedPosition,
            confidenceScore: turn.updatedConfidence,
            dialogueType: 'position_statement',
          },
        });

        this.emit({
          event: 'position_update',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            roundNumber,
            previousConfidence: prevConfidence,
            newConfidence: turn.updatedConfidence,
            deltaConfidence,
            previousPosition: prevPosition,
            newPosition: turn.updatedPosition,
            catalystPersonaIds: catalysts,
            shiftRationale: turnData.shiftExplanation,
          },
        });
      } catch (err: any) {
        console.warn(
          `Persona ${persona.id} cross-exam call failed (${err?.message || err}), using resilient archetype fallback.`
        );

        const fallbackTurnData = generateFallbackCrossExamTurn(
          persona.id,
          roundNumber,
          prevPosition,
          prevConfidence,
          activeMembers.map((m) => m.id)
        );

        const deltaConfidence = fallbackTurnData.updatedConfidence - prevConfidence;
        const catalysts = fallbackTurnData.responsesToPeers.map(
          (r: any) => r.targetPersonaId as PersonaId
        );

        const shiftRecord: ShiftRecord = {
          personaId: persona.id,
          roundNumber,
          previousPosition: prevPosition,
          newPosition: fallbackTurnData.updatedPosition,
          previousConfidence: prevConfidence,
          newConfidence: fallbackTurnData.updatedConfidence,
          deltaConfidence,
          catalystPersonaIds: catalysts,
          shiftRationale: fallbackTurnData.shiftExplanation,
          timestamp: new Date().toISOString(),
        };

        this.session.positionShiftHistory.push(shiftRecord);

        const turn: CrossExamTurn = {
          personaId: persona.id,
          roundNumber,
          responses: fallbackTurnData.responsesToPeers.map((r: any) => ({
            targetPersonaId: r.targetPersonaId as PersonaId,
            action: r.action,
            critiqueOrSupport: r.critiqueOrSupport,
          })),
          updatedPosition: fallbackTurnData.updatedPosition,
          updatedConfidence: fallbackTurnData.updatedConfidence,
          shiftRecord,
          shiftExplanation: fallbackTurnData.shiftExplanation,
          timestamp: new Date().toISOString(),
        };

        roundTurns[persona.id] = turn;

        for (const resp of turn.responses) {
          this.emit({
            event: 'persona_message',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              phase: 'PHASE_2_CROSS_EXAM',
              roundNumber,
              content: resp.critiqueOrSupport,
              dialogueType: 'peer_response',
              targetPersonaId: resp.targetPersonaId,
              action: resp.action,
            },
          });
        }

        this.emit({
          event: 'persona_message',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            phase: 'PHASE_2_CROSS_EXAM',
            roundNumber,
            content: turn.updatedPosition,
            confidenceScore: turn.updatedConfidence,
            dialogueType: 'position_statement',
          },
        });

        this.emit({
          event: 'position_update',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            roundNumber,
            previousConfidence: prevConfidence,
            newConfidence: turn.updatedConfidence,
            deltaConfidence,
            previousPosition: prevPosition,
            newPosition: turn.updatedPosition,
            catalystPersonaIds: catalysts,
            shiftRationale: fallbackTurnData.shiftExplanation,
          },
        });
      }
    };

    // Wave 1: run concurrently without any peer turns yet
    await Promise.all(wave1.map((persona) => processTurn(persona)));

    // Wave 2: run concurrently with Wave 1's completed turns available
    await Promise.all(wave2.map((persona) => processTurn(persona, roundTurns)));

    const completedRound: CrossExamRound = {
      roundNumber,
      turns: roundTurns,
      completedAt: new Date().toISOString(),
    };

    this.session.crossExamRounds.push(completedRound);

    this.emit({
      event: 'cross_exam_round_complete',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        roundNumber,
        completedAt: completedRound.completedAt,
      },
    });
  }

  // ===========================================================================
  // Phase 3: Convergence Check (Moderator)
  // ===========================================================================
  private async runPhase3ConvergenceCheck(roundNumber: number): Promise<ConvergenceDraft> {
    this.session.currentPhase = 'PHASE_3_CONVERGENCE_CHECK';

    this.emit({
      event: 'phase_started',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        phase: 'PHASE_3_CONVERGENCE_CHECK',
        phaseIndex: 3,
        description: `Evaluating chamber alignment and synthesizing Round ${roundNumber} consensus draft`,
      },
    });

    this.checkBudgetAndTimeout();

    // 1. Calculate quantitative convergence metrics
    const metrics = calculateConvergenceMetrics(this.session);

    // 2. Synthesize draft via Moderator LLM or fallback
    const prompt = buildConvergenceCheckPrompt(
      this.session.framing!,
      this.session.crossExamRounds,
      this.session.openingPositions as Record<PersonaId, OpeningPosition>,
      this.session.rawQuery
    );

    let draftContent = {
      draftConsensusStatement: '',
      remainingDisagreements: [] as string[],
      keyAlignmentPoints: [] as string[],
      outcomeConsensusReached: false,
    };

    try {
      const response = await this.limiter.run(() =>
        this.provider.generateStructured(prompt, ConvergenceCheckSchema, {
          systemInstruction: MODERATOR.systemPrompt,
        })
      );
      this.session.totalCallsExecuted++;

      draftContent = {
        draftConsensusStatement: response.data.draftConsensusStatement,
        remainingDisagreements: response.data.remainingDisagreements,
        keyAlignmentPoints: response.data.keyAlignmentPoints,
        outcomeConsensusReached: Boolean(response.data.outcomeConsensusReached),
      };
    } catch (err: any) {
      console.warn('Moderator convergence check failed, using fallback:', err?.message || String(err));
      const fallback = generateFallbackConvergence(
        roundNumber,
        metrics.alignmentScore,
        metrics.varianceScore
      );
      draftContent = fallback;
    }

    const draft: ConvergenceDraft = {
      roundNumber,
      draftConsensusText: draftContent.draftConsensusStatement,
      coreAgreements: draftContent.keyAlignmentPoints,
      remainingDisagreements: draftContent.remainingDisagreements,
      alignmentScore: metrics.alignmentScore,
      varianceScore: metrics.varianceScore,
      memberAgreementScores: metrics.memberAgreementScores,
      outcomeConsensusReached: draftContent.outcomeConsensusReached,
      timestamp: new Date().toISOString(),
    };

    this.session.convergenceDrafts.push(draft);

    this.emit({
      event: 'moderator_draft',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        draftRound: roundNumber,
        draftConsensusText: draft.draftConsensusText,
        alignmentScore: draft.alignmentScore,
        varianceScore: draft.varianceScore,
        remainingDisagreements: draft.remainingDisagreements,
        keyAlignmentPoints: draft.coreAgreements,
        outcomeConsensusReached: draft.outcomeConsensusReached,
      },
    });

    return draft;
  }

  // ===========================================================================
  // Phase 4: Ratification (Cycles 1 to 1 + maxRatificationCycles)
  // ===========================================================================
  private async runPhase4Ratification(outcomeAlreadyAgreed: boolean = false): Promise<{
    isUnanimous: boolean;
    finalDraft: string;
    lastCycleVotes: Record<PersonaId, RatificationVote>;
  }> {
    this.session.currentPhase = 'PHASE_4_RATIFICATION';

    this.emit({
      event: 'phase_started',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        phase: 'PHASE_4_RATIFICATION',
        phaseIndex: 4,
        description: outcomeAlreadyAgreed
          ? 'Outcome settled unanimously in debate. Chamber entering amendments-only ratification.'
          : 'Chamber voting on consensus statement; resolving amendments and objections',
      },
    });

    const maxExtraCycles = this.session.options.maxRatificationCycles;
    let currentDraft =
      this.session.convergenceDrafts[this.session.convergenceDrafts.length - 1]
        ?.draftConsensusText || 'Proposed consensus resolution.';

    let isUnanimous = false;
    let cycleNumber = 1;
    let lastVotes: Record<PersonaId, RatificationVote> = {} as any;
    let previousObjections: string[] = [];

    // Cycle loop: Initial (1) + up to maxExtraCycles (default 2 extra)
    while (cycleNumber <= 1 + maxExtraCycles) {
      this.session.currentRatificationCycle = cycleNumber;
      const activeMembers = this.getActiveCouncilMembers();
      const currentCycleVotes: Record<PersonaId, RatificationVote> = {} as any;

      // Parallel voting across all active members
      const votePromises = activeMembers.map(async (persona) => {
        this.checkBudgetAndTimeout();
        // Retrieve this persona's last stated position from cross-exam
        const myLastRound = this.session.crossExamRounds[this.session.crossExamRounds.length - 1];
        const myLastTurn = myLastRound?.turns[persona.id as PersonaId];
        const myCurrentPosition = myLastTurn?.updatedPosition
          || this.session.openingPositions[persona.id]?.positionSummary
          || undefined;

        const prompt = buildRatificationPrompt(
          persona,
          currentDraft,
          cycleNumber,
          previousObjections,
          myCurrentPosition,
          outcomeAlreadyAgreed
        );

        try {
          const response = await this.limiter.run(() =>
            this.provider.generateStructured(prompt, RatificationVoteSchema, {
              systemInstruction: persona.systemPrompt,
            })
          );
          this.session.totalCallsExecuted++;

          const voteData = response.data;

          let voteType = voteData.vote;
          let amendmentText = voteData.amendmentSuggestion;
          let objectionReason = voteData.objectionReason;

          // If outcome was agreed unanimously in cross-exam, OBJECT is locked out.
          // Convert any dissent into an amendment reservation for the record.
          if (outcomeAlreadyAgreed && voteType === 'OBJECT') {
            voteType = 'SIGN_OFF_WITH_AMENDMENT';
            amendmentText = objectionReason || 'Reservation on principle noted for the record';
            objectionReason = undefined;
          }

          const vote: RatificationVote = {
            personaId: persona.id,
            cycleNumber,
            vote: voteType,
            amendmentText,
            objectionReason,
            closingComment: voteData.closingComment,
            timestamp: new Date().toISOString(),
          };

          currentCycleVotes[persona.id] = vote;

          this.emit({
            event: 'ratification_vote',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              cycleNumber,
              vote: vote.vote,
              amendmentText: vote.amendmentText,
              objectionReason: vote.objectionReason,
              closingComment: vote.closingComment,
            },
          });
        } catch (err: any) {
          console.warn(
            `Persona ${persona.id} ratification vote failed (${err?.message || err}), using resilient archetype fallback.`
          );

          const fallbackVoteData = generateFallbackRatificationVote(persona.id, currentDraft);
          const vote: RatificationVote = {
            personaId: persona.id,
            cycleNumber,
            vote: fallbackVoteData.vote,
            amendmentText: fallbackVoteData.amendmentSuggestion,
            objectionReason: fallbackVoteData.objectionReason,
            closingComment: fallbackVoteData.closingComment,
            timestamp: new Date().toISOString(),
          };

          currentCycleVotes[persona.id] = vote;

          this.emit({
            event: 'ratification_vote',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              cycleNumber,
              vote: vote.vote,
              amendmentText: vote.amendmentText,
              objectionReason: vote.objectionReason,
              closingComment: vote.closingComment,
            },
          });
        }
      });

      await Promise.all(votePromises);
      lastVotes = currentCycleVotes;

      // Evaluate unanimity over currently available members.
      // SIGN_OFF_WITH_AMENDMENT counts as ratification — only hard OBJECT votes
      // block a unanimous pass.
      const activeVotes = Object.values(currentCycleVotes);
      const hasHardObjections = activeVotes.some((v) => v.vote === 'OBJECT');
      const allAgreed = activeVotes.length > 0 && !hasHardObjections;

      if (allAgreed) {
        isUnanimous = true;
        this.session.ratificationCycles.push({
          cycleNumber,
          draftSubmitted: currentDraft,
          votes: currentCycleVotes,
          cycleOutcome: 'UNANIMOUS_PASS',
          timestamp: new Date().toISOString(),
        });

        this.emit({
          event: 'ratification_cycle_complete',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            cycleNumber,
            cycleOutcome: 'UNANIMOUS_PASS',
            completedAt: new Date().toISOString(),
          },
        });
        break;
      }

      // Real objections remain — decide cycle outcome
      const hasAmendments = activeVotes.some((v) => v.vote === 'SIGN_OFF_WITH_AMENDMENT');

      const isLastCycle = cycleNumber >= 1 + maxExtraCycles;
      // DEADLOCK only when there are actual OBJECT votes on the last cycle
      const cycleOutcome = isLastCycle ? 'DEADLOCK' : 'REVISION_REQUIRED';

      this.session.ratificationCycles.push({
        cycleNumber,
        draftSubmitted: currentDraft,
        votes: currentCycleVotes,
        cycleOutcome,
        timestamp: new Date().toISOString(),
      });

      this.emit({
        event: 'ratification_cycle_complete',
        sessionId: this.session.sessionId,
        timestamp: new Date().toISOString(),
        payload: {
          cycleNumber,
          cycleOutcome,
          completedAt: new Date().toISOString(),
        },
      });

      if (isLastCycle) {
        // Honesty Rule triggers: hard objections remain, cycles exhausted
        break;
      }

      // Collect feedback to carry forward: hard objections + amendment requests
      previousObjections = activeVotes
        .filter((v) => v.vote === 'OBJECT' || v.vote === 'SIGN_OFF_WITH_AMENDMENT')
        .map((v) => `${v.personaId}: ${v.amendmentText || v.objectionReason}`);

      // Check if limits reached before attempting next revision cycle
      if (
        this.session.totalCallsExecuted >= this.session.options.callBudget ||
        Date.now() - this.startTime > this.session.options.sessionTimeoutMs
      ) {
        console.warn('Session limits reached during ratification cycles, proceeding to final verdict.');
        break;
      }

      const revisionPrompt = buildModeratorRevisionPrompt(
        currentDraft,
        currentCycleVotes,
        this.session.rawQuery
      );

      try {
        const revResponse = await this.limiter.run(() =>
          this.provider.generateText(revisionPrompt, {
            systemInstruction: MODERATOR.systemPrompt,
          })
        );
        this.session.totalCallsExecuted++;
        currentDraft = revResponse.data.trim();
      } catch (err: any) {
        console.warn('Moderator revision call failed, using fallback:', err?.message || String(err));
        currentDraft = generateFallbackRevisedDraft(currentDraft, currentCycleVotes);
      }

      cycleNumber++;
    }

    return {
      isUnanimous,
      finalDraft: currentDraft,
      lastCycleVotes: lastVotes,
    };
  }

  // ===========================================================================
  // Phase 5: Final Output & Honesty Rule Synthesis
  // ===========================================================================
  private async runPhase5FinalOutput(ratificationOutcome: {
    isUnanimous: boolean;
    finalDraft: string;
    lastCycleVotes: Record<PersonaId, RatificationVote>;
  }): Promise<FinalVerdict> {
    this.session.currentPhase = 'PHASE_5_FINAL_OUTPUT';

    this.emit({
      event: 'phase_started',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        phase: 'PHASE_5_FINAL_OUTPUT',
        phaseIndex: 5,
        description: 'Generating final plain-language conclusion, shift summary, and caveats',
      },
    });

    const { isUnanimous, finalDraft, lastCycleVotes } = ratificationOutcome;

    // Build "How views shifted" summaries per persona
    const personaShiftSummaries: Record<PersonaId, string> = {} as any;
    for (const member of COUNCIL_MEMBERS) {
      const opening = this.session.openingPositions[member.id];
      const shifts = this.session.positionShiftHistory.filter(
        (s) => s.personaId === member.id
      );

      if (!opening) {
        personaShiftSummaries[member.id] = 'Member unavailable during deliberation.';
        continue;
      }

      const startPos = opening.positionSummary;
      const endShift = shifts[shifts.length - 1];
      const endPos = endShift ? endShift.newPosition : startPos;
      const catalyst = endShift?.catalystPersonaIds?.join(', ') || 'internal reflection';
      const rationale = endShift?.shiftRationale || 'Stance held firm.';

      personaShiftSummaries[member.id] =
        `Started at ${opening.confidenceScore}% confidence: "${startPos}". Shifted to "${endPos}". Catalyst: ${catalyst} (${rationale}).`;
    }

    // Identify surviving objections if Honesty Rule active
    const survivingObjections: SurvivingObjection[] = [];
    const ratifiedBy: PersonaId[] = [];

    for (const [id, vote] of Object.entries(lastCycleVotes)) {
      // Both clean sign-offs and amendment-qualified sign-offs count as ratification
      if (vote.vote === 'SIGN_OFF' || vote.vote === 'SIGN_OFF_WITH_AMENDMENT') {
        ratifiedBy.push(id as PersonaId);
      }
      // Only hard OBJECT votes are surviving objections for the Honesty Rule record
      if (vote.vote === 'OBJECT') {
        survivingObjections.push({
          personaId: id as PersonaId,
          objectionText: vote.objectionReason || 'Substantive objection',
          irreconcilablePrinciple:
            vote.closingComment || 'Core architectural / ethical principle violated',
        });
      }
    }

    let synthesisData: {
      verdictOneLiner: string;
      unanimousConclusion: string;
      consensusReached: boolean;
      keyReasons: string[];
      mainCaveats: string[];
      actionableGuidance: string[];
    };

    const finalPrompt = buildFinalSynthesisPrompt(
      this.session.framing!,
      finalDraft,
      isUnanimous,
      lastCycleVotes,
      this.session.rawQuery
    );

    try {
      this.checkBudgetAndTimeout();
      const response = await this.limiter.run(() =>
        this.provider.generateStructured(finalPrompt, FinalSynthesisSchema, {
          systemInstruction: MODERATOR.systemPrompt,
        })
      );
      this.session.totalCallsExecuted++;
      synthesisData = response.data;
    } catch (err: any) {
      console.warn('Moderator final synthesis failed, using fallback:', err?.message || String(err));
      synthesisData = generateFallbackFinalSynthesis(
        this.session.rawQuery,
        finalDraft,
        isUnanimous,
        lastCycleVotes
      );
    }

    const durationMs = Date.now() - this.startTime;
    const finalVerdict: FinalVerdict = {
      status: isUnanimous ? 'UNANIMOUS_CONSENSUS' : 'CONSENSUS_NOT_FULLY_REACHED',
      isUnanimous,
      verdictOneLiner: synthesisData.verdictOneLiner,
      actionableConclusion: synthesisData.unanimousConclusion,
      keySupportingReasons: synthesisData.keyReasons,
      criticalCaveatsAndRisks: synthesisData.mainCaveats,
      personaShiftSummaries,
      ratifiedBy,
      survivingObjections,
      totalRoundsDeliberated: this.session.crossExamRounds.length,
      totalCallsUsed: this.session.totalCallsExecuted,
      durationMs,
      completedAt: new Date().toISOString(),
    };

    this.session.finalVerdict = finalVerdict;

    this.emit({
      event: 'final_verdict',
      sessionId: this.session.sessionId,
      timestamp: new Date().toISOString(),
      payload: finalVerdict,
    });

    return finalVerdict;
  }
}

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
  getPersonaById,
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
} from './fallback';
import {
  FramingSchema,
  OpeningPositionSchema,
  CrossExamTurnSchema,
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

  private checkBudgetAndTimeout(): void {
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
      // Phase 2 & 3: Cross-Examination & Convergence Check (up to N rounds)
      // -----------------------------------------------------------------------
      const maxRounds = this.session.options.maxCrossExamRounds;
      for (let round = 1; round <= maxRounds; round++) {
        await this.runPhase2CrossExamRound(round);
        const draft = await this.runPhase3ConvergenceCheck(round);

        // Early convergence if strong consensus reached before max rounds
        if (draft.alignmentScore >= 95 && round >= 2) {
          break;
        }
      }

      // -----------------------------------------------------------------------
      // Phase 4: Ratification (Initial + up to maxRatificationCycles revisions)
      // -----------------------------------------------------------------------
      const ratificationOutcome = await this.runPhase4Ratification();

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
    } catch (err) {
      console.warn('Moderator framing call failed, using deterministic fallback:', err);
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
        // Mark persona as unavailable upon failure after retries
        console.warn(`Persona ${persona.id} failed opening position:`, err.message);
        this.session.memberStatuses[persona.id] = 'unavailable';

        this.emit({
          event: 'persona_unavailable',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            reason: `Call failed: ${err.message}`,
          },
        });
      }
    });

    await Promise.all(openingPromises);
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

    const turnPromises = activeMembers.map(async (persona) => {
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
        this.session.rawQuery
      );

      try {
        const response = await this.limiter.run(() =>
          this.provider.generateStructured(prompt, CrossExamTurnSchema, {
            systemInstruction: persona.systemPrompt,
          })
        );
        this.session.totalCallsExecuted++;

        const turnData = response.data;
        const deltaConfidence = turnData.updatedConfidence - prevConfidence;
        const catalysts = turnData.responsesToPeers.map(
          (r) => r.targetPersonaId as PersonaId
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
          responses: turnData.responsesToPeers.map((r) => ({
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

        // Emit message and position update
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
        console.warn(`Persona ${persona.id} failed cross-exam round ${roundNumber}:`, err.message);
        this.session.memberStatuses[persona.id] = 'unavailable';

        this.emit({
          event: 'persona_unavailable',
          sessionId: this.session.sessionId,
          timestamp: new Date().toISOString(),
          payload: {
            personaId: persona.id,
            reason: `Cross-exam call failed: ${err.message}`,
          },
        });
      }
    });

    await Promise.all(turnPromises);

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
      };
    } catch (err) {
      console.warn('Moderator convergence check failed, using fallback:', err);
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
      },
    });

    return draft;
  }

  // ===========================================================================
  // Phase 4: Ratification (Cycles 1 to 1 + maxRatificationCycles)
  // ===========================================================================
  private async runPhase4Ratification(): Promise<{
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
        description: 'Chamber voting on consensus statement; resolving amendments and objections',
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
        const prompt = buildRatificationPrompt(
          persona,
          currentDraft,
          cycleNumber,
          previousObjections
        );

        try {
          const response = await this.limiter.run(() =>
            this.provider.generateStructured(prompt, RatificationVoteSchema, {
              systemInstruction: persona.systemPrompt,
            })
          );
          this.session.totalCallsExecuted++;

          const voteData = response.data;
          const vote: RatificationVote = {
            personaId: persona.id,
            cycleNumber,
            vote: voteData.vote,
            amendmentText: voteData.amendmentSuggestion,
            objectionReason: voteData.objectionReason,
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
          console.warn(`Persona ${persona.id} ratification vote failed:`, err.message);
          this.session.memberStatuses[persona.id] = 'unavailable';

          this.emit({
            event: 'persona_unavailable',
            sessionId: this.session.sessionId,
            timestamp: new Date().toISOString(),
            payload: {
              personaId: persona.id,
              reason: `Ratification call failed: ${err.message}`,
            },
          });
        }
      });

      await Promise.all(votePromises);
      lastVotes = currentCycleVotes;

      // Evaluate unanimity over currently available members
      const activeVotes = Object.values(currentCycleVotes);
      const allSignedOff =
        activeVotes.length > 0 && activeVotes.every((v) => v.vote === 'SIGN_OFF');

      if (allSignedOff) {
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

      // If not unanimous and cycles remain, synthesize revisions
      const hasObjections = activeVotes.some((v) => v.vote === 'OBJECT');
      const hasAmendments = activeVotes.some((v) => v.vote === 'SIGN_OFF_WITH_AMENDMENT');

      const isLastCycle = cycleNumber >= 1 + maxExtraCycles;
      const cycleOutcome = isLastCycle
        ? 'DEADLOCK'
        : 'REVISION_REQUIRED';

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
        // Honesty Rule triggers: cycles exhausted, consensus not fully reached
        break;
      }

      // Collect objections to carry forward
      previousObjections = activeVotes
        .filter((v) => v.vote === 'OBJECT' || v.vote === 'SIGN_OFF_WITH_AMENDMENT')
        .map((v) => `${v.personaId}: ${v.amendmentText || v.objectionReason}`);

      // Moderator revises draft
      this.checkBudgetAndTimeout();
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
      } catch (err) {
        console.warn('Moderator revision call failed, using fallback:', err);
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
      if (vote.vote === 'SIGN_OFF') {
        ratifiedBy.push(id as PersonaId);
      } else if (vote.vote === 'OBJECT') {
        survivingObjections.push({
          personaId: id as PersonaId,
          objectionText: vote.objectionReason || 'Substantive objection',
          irreconcilablePrinciple:
            vote.closingComment || 'Core architectural / ethical principle violated',
        });
      }
    }

    // Call Moderator for final synthesis
    this.checkBudgetAndTimeout();
    const finalPrompt = buildFinalSynthesisPrompt(
      this.session.framing!,
      finalDraft,
      isUnanimous,
      lastCycleVotes,
      this.session.rawQuery
    );

    let synthesisData: {
      unanimousConclusion: string;
      consensusReached: boolean;
      keyReasons: string[];
      mainCaveats: string[];
      actionableGuidance: string[];
    };

    try {
      const response = await this.limiter.run(() =>
        this.provider.generateStructured(finalPrompt, FinalSynthesisSchema, {
          systemInstruction: MODERATOR.systemPrompt,
        })
      );
      this.session.totalCallsExecuted++;
      synthesisData = response.data;
    } catch (err) {
      console.warn('Moderator final synthesis failed, using fallback:', err);
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

/**
 * The Council - Real-Time Server-Sent Events (SSE) Taxonomy
 *
 * Strongly typed events streamed to clients observing deliberation chamber sessions.
 */

import { PersonaId } from './persona';
import { DeliberationPhase, FinalVerdict, ShiftRecord } from './session';

export type CouncilEventType =
  | 'phase_started'
  | 'persona_message'
  | 'position_update'
  | 'cross_exam_round_complete'
  | 'moderator_draft'
  | 'ratification_vote'
  | 'ratification_cycle_complete'
  | 'persona_unavailable'
  | 'final_verdict'
  | 'session_error'
  | 'done';

export interface BaseSSEEvent<T extends CouncilEventType, P> {
  event: T;
  sessionId: string;
  timestamp: string;
  payload: P;
}

export type PhaseStartedEvent = BaseSSEEvent<'phase_started', {
  phase: DeliberationPhase;
  phaseIndex: number;
  description: string;
}>;

export type PersonaMessageEvent = BaseSSEEvent<'persona_message', {
  personaId: PersonaId;
  phase: DeliberationPhase;
  roundNumber?: number;
  content: string;
  confidenceScore?: number;
}>;

export type PositionUpdateEvent = BaseSSEEvent<'position_update', {
  personaId: PersonaId;
  roundNumber: number;
  previousConfidence: number;
  newConfidence: number;
  deltaConfidence: number;
  previousPosition: string;
  newPosition: string;
  catalystPersonaIds: PersonaId[];
  shiftRationale: string;
}>;

export type CrossExamRoundCompleteEvent = BaseSSEEvent<'cross_exam_round_complete', {
  roundNumber: number;
  completedAt: string;
}>;

export type ModeratorDraftEvent = BaseSSEEvent<'moderator_draft', {
  draftRound: number;
  draftConsensusText: string;
  alignmentScore: number;
  varianceScore: number;
  remainingDisagreements: string[];
  keyAlignmentPoints?: string[];
}>;

export type RatificationVoteEvent = BaseSSEEvent<'ratification_vote', {
  personaId: PersonaId;
  cycleNumber: number;
  vote: 'SIGN_OFF' | 'SIGN_OFF_WITH_AMENDMENT' | 'OBJECT';
  amendmentText?: string;
  objectionReason?: string;
  closingComment?: string;
}>;

export type RatificationCycleCompleteEvent = BaseSSEEvent<'ratification_cycle_complete', {
  cycleNumber: number;
  cycleOutcome: 'UNANIMOUS_PASS' | 'REVISION_REQUIRED' | 'DEADLOCK';
  completedAt: string;
}>;

export type PersonaUnavailableEvent = BaseSSEEvent<'persona_unavailable', {
  personaId: PersonaId;
  reason: string;
}>;

export type FinalVerdictEvent = BaseSSEEvent<'final_verdict', FinalVerdict>;

export type SessionErrorEvent = BaseSSEEvent<'session_error', {
  errorCode: string;
  message: string;
}>;

export type DoneEvent = BaseSSEEvent<'done', {
  sessionId: string;
}>;

export type CouncilSSEEvent =
  | PhaseStartedEvent
  | PersonaMessageEvent
  | PositionUpdateEvent
  | CrossExamRoundCompleteEvent
  | ModeratorDraftEvent
  | RatificationVoteEvent
  | RatificationCycleCompleteEvent
  | PersonaUnavailableEvent
  | FinalVerdictEvent
  | SessionErrorEvent
  | DoneEvent;

/**
 * Alias for external engine listeners and consumers
 */
export type DeliberationEvent = CouncilSSEEvent;

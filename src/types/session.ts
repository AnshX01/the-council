/**
 * The Council - Deliberation Session & State Machine Models
 *
 * Defines the core state, phase representations, transition artifacts,
 * and deliberation session entity.
 */

import { PersonaId, PersonaStatus } from './persona';

export type DeliberationPhase =
  | 'PHASE_0_FRAMING'
  | 'PHASE_1_OPENING'
  | 'PHASE_2_CROSS_EXAM'
  | 'PHASE_3_CONVERGENCE_CHECK'
  | 'PHASE_4_RATIFICATION'
  | 'PHASE_5_FINAL_OUTPUT'
  | 'FAILED';

export interface SessionOptions {
  maxCrossExamRounds: number;      // Default: 3
  maxRatificationCycles: number;   // Default: 2 (Initial + up to 2 revisions)
  concurrencyLimit: number;        // Default: 4 concurrent LLM requests
  callBudget: number;              // Default: 60 total LLM calls
  sessionTimeoutMs: number;        // Default: 300_000 (5 minutes)
  mockMode: boolean;               // Default: false
}

export const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  maxCrossExamRounds: 3,
  maxRatificationCycles: 2,
  concurrencyLimit: 4,
  callBudget: 60,
  sessionTimeoutMs: 300_000,
  mockMode: false,
};

export interface FramingArtifact {
  restatedQuestion: string;
  coreDecisions: string[];
  fundamentalAssumptions: string[];
  deliberationBounds: string;
  timestamp: string;
}

export interface OpeningPosition {
  personaId: PersonaId;
  positionSummary: string; // 1-3 sentences
  detailedReasoning: string;
  confidenceScore: number;  // 0 - 100
  falsificationCondition: string; // "What would change my mind"
  timestamp: string;
}

export type CrossExamAction = 'AGREE' | 'CHALLENGE' | 'CONCEDE';

export interface PersonaResponse {
  targetPersonaId: PersonaId;
  action: CrossExamAction;
  critiqueOrSupport: string;
}

export interface ShiftRecord {
  personaId: PersonaId;
  roundNumber: number;
  previousPosition: string;
  newPosition: string;
  previousConfidence: number;
  newConfidence: number;
  deltaConfidence: number;
  catalystPersonaIds: PersonaId[];
  shiftRationale: string;
  timestamp: string;
}

export interface CrossExamTurn {
  personaId: PersonaId;
  roundNumber: number;
  responses: PersonaResponse[]; // Min 2 responses
  updatedPosition: string;
  updatedConfidence: number;
  shiftRecord: ShiftRecord | null;
  shiftExplanation?: string;
  whatChanged?: string;
  timestamp: string;
}

export interface CrossExamRound {
  roundNumber: number;
  turns: Partial<Record<PersonaId, CrossExamTurn>>;
  completedAt: string;
}

export interface ConvergenceDraft {
  roundNumber: number;
  draftConsensusText: string;
  coreAgreements: string[];
  remainingDisagreements: string[];
  alignmentScore: number;     // 0 - 100
  varianceScore: number;      // Variance across member confidences
  memberAgreementScores: Partial<Record<PersonaId, number>>; // 0 - 100
  timestamp: string;
}

export type RatificationVoteType =
  | 'SIGN_OFF'
  | 'SIGN_OFF_WITH_AMENDMENT'
  | 'OBJECT';

export interface RatificationVote {
  personaId: PersonaId;
  cycleNumber: number;
  vote: RatificationVoteType;
  amendmentText?: string;
  objectionReason?: string;
  closingComment?: string;
  timestamp: string;
}

export interface RatificationCycle {
  cycleNumber: number;
  draftSubmitted: string;
  votes: Partial<Record<PersonaId, RatificationVote>>;
  cycleOutcome: 'UNANIMOUS_PASS' | 'REVISION_REQUIRED' | 'DEADLOCK';
  moderatorSynthesis?: string;
  timestamp: string;
}

export type VerdictStatus =
  | 'UNANIMOUS_CONSENSUS'
  | 'CONSENSUS_NOT_FULLY_REACHED'
  | 'SESSION_TIMED_OUT'
  | 'BUDGET_EXCEEDED';

export interface SurvivingObjection {
  personaId: PersonaId;
  objectionText: string;
  irreconcilablePrinciple: string;
}

export interface FinalVerdict {
  status: VerdictStatus;
  isUnanimous: boolean;
  actionableConclusion: string; // Plain language, concrete directives
  keySupportingReasons: string[];
  criticalCaveatsAndRisks: string[];
  personaShiftSummaries: Record<PersonaId, string>;
  ratifiedBy: PersonaId[];
  survivingObjections: SurvivingObjection[];
  totalRoundsDeliberated: number;
  totalCallsUsed: number;
  durationMs: number;
  completedAt: string;
}

export interface DeliberationSession {
  sessionId: string;
  rawQuery: string;
  options: SessionOptions;
  currentPhase: DeliberationPhase;
  currentCrossExamRound: number;
  currentRatificationCycle: number;
  memberStatuses: Record<PersonaId, PersonaStatus>;

  // Artifacts accumulated per phase
  framing: FramingArtifact | null;
  openingPositions: Partial<Record<PersonaId, OpeningPosition>>;
  crossExamRounds: CrossExamRound[];
  positionShiftHistory: ShiftRecord[];
  convergenceDrafts: ConvergenceDraft[];
  ratificationCycles: RatificationCycle[];
  finalVerdict: FinalVerdict | null;

  // Runtime metadata
  totalCallsExecuted: number;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  error?: string;
}

/**
 * The Council - Deliberation Message & Communication Types
 *
 * Types for structured messages, cross-examination exchanges,
 * position shifts, and convergence drafts.
 */

import { PersonaId } from './persona';
import {
  CrossExamAction,
  PersonaResponse,
  ShiftRecord,
  CrossExamTurn,
  CrossExamRound,
  ConvergenceDraft,
  RatificationVote,
  RatificationCycle,
} from './session';

export type {
  CrossExamAction,
  PersonaResponse,
  ShiftRecord,
  CrossExamTurn,
  CrossExamRound,
  ConvergenceDraft,
  RatificationVote,
  RatificationCycle,
};

export interface PersonaSpeechMessage {
  id: string;
  personaId: PersonaId;
  phase: string;
  roundNumber?: number;
  content: string;
  confidenceScore?: number;
  timestamp: string;
}

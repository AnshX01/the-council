/**
 * The Council - Zod Validation Schemas
 *
 * Runtime schemas and type inference for all structured LLM generation calls
 * and API payloads.
 */

import { z } from 'zod';
import { PersonaId, PERSONA_IDS } from './persona';

// ---------------------------------------------------------------------------
// 1. Moderator Framing Schema (Phase 0)
// ---------------------------------------------------------------------------
export const FramingSchema = z.object({
  restatedQuestion: z
    .string()
    .min(1, 'Restated question cannot be empty')
    .describe('Neutral, de-biased reformulation of the user query'),
  coreDecisions: z
    .array(z.string().min(1))
    .min(1, 'At least one core decision vector is required')
    .describe('3-5 pivotal decision forks or tradeoffs to resolve'),
  fundamentalAssumptions: z
    .array(z.string().min(1))
    .min(1, 'At least one fundamental assumption is required')
    .describe('Implicit premises that the deliberation relies upon'),
  deliberationBounds: z
    .string()
    .min(1, 'Deliberation bounds cannot be empty')
    .describe('Explicit scope, exclusions, and problem boundaries'),
});

export type FramingPayload = z.infer<typeof FramingSchema>;

// ---------------------------------------------------------------------------
// 2. Persona Opening Position Schema (Phase 1)
// ---------------------------------------------------------------------------
export const OpeningPositionSchema = z.object({
  positionSummary: z
    .string()
    .min(1, 'Position summary cannot be empty')
    .describe('1-3 sentence core stance from the persona philosophical lens'),
  detailedReasoning: z
    .string()
    .min(1, 'Detailed reasoning cannot be empty')
    .describe('In-depth analytical rationale and supporting arguments'),
  confidenceScore: z
    .number()
    .min(0, 'Confidence must be between 0 and 100')
    .max(100, 'Confidence must be between 0 and 100')
    .describe('Initial confidence score from 0 to 100'),
  falsificationCondition: z
    .string()
    .min(1, 'Falsification condition cannot be empty')
    .describe('Specific evidence or proof that would change this persona mind'),
});

export type OpeningPositionPayload = z.infer<typeof OpeningPositionSchema>;

// ---------------------------------------------------------------------------
// 3. Cross-Examination Turn Schema (Phase 2)
// ---------------------------------------------------------------------------
export const CrossExamActionSchema = z.enum(['AGREE', 'CHALLENGE', 'CONCEDE']);
export type CrossExamActionType = z.infer<typeof CrossExamActionSchema>;

export const PeerResponseSchema = z.object({
  targetPersonaId: z
    .string()
    .min(1, 'Target persona ID cannot be empty')
    .describe('The personaId being addressed (e.g. skeptic, optimist)'),
  action: CrossExamActionSchema.describe('Nature of the dialectical engagement'),
  critiqueOrSupport: z
    .string()
    .min(1, 'Critique or support statement cannot be empty')
    .describe('Direct philosophical challenge, agreement, or concession'),
});

export type PeerResponsePayload = z.infer<typeof PeerResponseSchema>;

export const CrossExamTurnSchema = z.object({
  responsesToPeers: z
    .array(PeerResponseSchema)
    .min(2, 'Must engage with at least two named peers in each cross-examination round')
    .describe('Responses addressing at least 2 distinct council members'),
  updatedPosition: z
    .string()
    .min(1, 'Updated position cannot be empty')
    .describe('Current refined stance following cross-examination'),
  updatedConfidence: z
    .number()
    .min(0, 'Updated confidence must be between 0 and 100')
    .max(100, 'Updated confidence must be between 0 and 100')
    .describe('Refined confidence score after reviewing peers'),
  shiftExplanation: z
    .string()
    .min(1, 'Shift explanation cannot be empty')
    .describe('Explanation of why confidence or stance moved, or why it held firm'),
  whatChanged: z
    .string()
    .min(1, 'whatChanged description cannot be empty')
    .describe('Concise delta of perspective from the previous round'),
});

export type CrossExamTurnPayload = z.infer<typeof CrossExamTurnSchema>;

// ---------------------------------------------------------------------------
// 4. Convergence Check Schema (Phase 3)
// ---------------------------------------------------------------------------
export const ConvergenceCheckSchema = z.object({
  draftConsensusStatement: z
    .string()
    .min(1, 'Draft consensus statement cannot be empty')
    .describe('Synthesized consensus text encapsulating points of agreement'),
  remainingDisagreements: z
    .array(z.string())
    .describe('Outstanding points of contention or friction between personas'),
  convergenceScore: z
    .number()
    .min(0, 'Convergence score must be between 0 and 100')
    .max(100, 'Convergence score must be between 0 and 100')
    .describe('Subjective/analytical alignment index across the council (0-100)'),
  keyAlignmentPoints: z
    .array(z.string())
    .describe('Core principles or conclusions all or most members endorse'),
});

export type ConvergenceCheckPayload = z.infer<typeof ConvergenceCheckSchema>;

// ---------------------------------------------------------------------------
// 5. Ratification Vote Schema (Phase 4)
// ---------------------------------------------------------------------------
export const RatificationVoteTypeSchema = z.enum([
  'SIGN_OFF',
  'SIGN_OFF_WITH_AMENDMENT',
  'OBJECT',
]);

export type RatificationVoteEnum = z.infer<typeof RatificationVoteTypeSchema>;

export const RatificationVoteSchema = z.object({
  vote: RatificationVoteTypeSchema.describe('Ratification vote decision'),
  amendmentSuggestion: z
    .string()
    .optional()
    .describe('Proposed modification text required for sign-off (if SIGN_OFF_WITH_AMENDMENT)'),
  objectionReason: z
    .string()
    .optional()
    .describe('Irreconcilable philosophical or factual flaw preventing sign-off (if OBJECT)'),
  closingComment: z
    .string()
    .min(1, 'Closing comment cannot be empty')
    .describe('Final remarks on the consensus statement'),
});

export type RatificationVotePayload = z.infer<typeof RatificationVoteSchema>;

// ---------------------------------------------------------------------------
// 6. Final Synthesis Schema (Phase 5)
// ---------------------------------------------------------------------------
export const FinalSynthesisSchema = z.object({
  unanimousConclusion: z
    .string()
    .min(1, 'Conclusion cannot be empty')
    .describe('Definitive consensus verdict or structured non-consensus resolution'),
  consensusReached: z
    .boolean()
    .describe('True if unanimous agreement was achieved; false if honesty rule activated'),
  keyReasons: z
    .array(z.string().min(1))
    .min(1, 'At least one key reason is required')
    .describe('Primary arguments and evidential pillars supporting the verdict'),
  mainCaveats: z
    .array(z.string())
    .describe('Critical vulnerabilities, boundary limits, or warnings'),
  actionableGuidance: z
    .array(z.string().min(1))
    .min(1, 'At least one actionable guidance point is required')
    .describe('Concrete operational next steps or directives'),
});

export type FinalSynthesisPayload = z.infer<typeof FinalSynthesisSchema>;

// ---------------------------------------------------------------------------
// 7. Session Options & Creation Request Schemas
// ---------------------------------------------------------------------------
export const SessionOptionsSchema = z.object({
  maxCrossExamRounds: z.number().int().min(1).max(5).default(3),
  maxRatificationCycles: z.number().int().min(1).max(3).default(2),
  concurrencyLimit: z.number().int().min(1).max(8).default(4),
  callBudget: z.number().int().min(20).max(100).default(60),
  sessionTimeoutMs: z.number().int().min(30000).max(600000).default(300000),
  mockMode: z.boolean().default(false),
});

export const CreateSessionRequestSchema = z.object({
  query: z
    .string()
    .min(10, 'Query must be at least 10 characters')
    .max(2000, 'Query cannot exceed 2000 characters')
    .trim(),
  options: SessionOptionsSchema.optional().default({}),
});

export type CreateSessionRequestInput = z.infer<typeof CreateSessionRequestSchema>;

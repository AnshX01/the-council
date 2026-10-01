/**
 * The Council - Zod Validation Schemas
 *
 * Runtime schemas and type inference for all structured LLM generation calls
 * and API payloads.
 */

import { z } from 'zod';
import { PersonaId, PERSONA_IDS } from './persona';
// normalizePersonaId is imported here (not from @/types to avoid circular dep)
// It lives in personas.ts which re-exports from @/types/persona
import { normalizePersonaId } from '@/lib/council/personas';

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 0. Task Type Classifier Schema
// ---------------------------------------------------------------------------
export const TaskTypeSchema = z.enum(['DETERMINISTIC', 'JUDGMENT']);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const ClaimVerificationRowSchema = z.object({
  claim: z.string().describe('The claim, statement, or condition being checked'),
  evaluatedTruthValue: z.boolean().describe('The evaluated truth value (true/false) under proposed answer'),
  expectedTruthValue: z.boolean().describe('The truth value required by the assigned type/conditions'),
  passed: z.boolean().describe('True if evaluatedTruthValue matches expectedTruthValue'),
});
export type ClaimVerificationRow = z.infer<typeof ClaimVerificationRowSchema>;

// 1. Moderator Framing Schema (Phase 0)
// ---------------------------------------------------------------------------
export const BaseFramingSchema = z.object({
  taskType: TaskTypeSchema.default('JUDGMENT').describe('DETERMINISTIC (logic, math, puzzles, verifiable facts) or JUDGMENT (ethics, policy, strategy, opinion)'),
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

export type FramingPayload = z.infer<typeof BaseFramingSchema>;

export const FramingSchema: z.ZodType<FramingPayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    let taskType: TaskType = 'JUDGMENT';
    const rawType = (raw.taskType || raw.type || '').toString().toUpperCase();
    if (rawType.includes('DETERMINISTIC') || rawType.includes('LOGIC') || rawType.includes('MATH') || rawType.includes('PUZZLE')) {
      taskType = 'DETERMINISTIC';
    }
    return {
      taskType,
      restatedQuestion: raw.restatedQuestion || raw.question || raw.restatement || '',
      coreDecisions:
        Array.isArray(raw.coreDecisions) && raw.coreDecisions.length > 0
          ? raw.coreDecisions
          : Array.isArray(raw.decisions) && raw.decisions.length > 0
          ? raw.decisions
          : ['Analyze strategic trade-offs and foundational principles'],
      fundamentalAssumptions:
        Array.isArray(raw.fundamentalAssumptions) && raw.fundamentalAssumptions.length > 0
          ? raw.fundamentalAssumptions
          : Array.isArray(raw.assumptions) && raw.assumptions.length > 0
          ? raw.assumptions
          : ['Reasoning from verified baseline conditions and logical consistency'],
      deliberationBounds:
        raw.deliberationBounds ||
        raw.bounds ||
        raw.scope ||
        'Bounded to core ethical, empirical, and operational criteria.',
    };
  },
  BaseFramingSchema
);

// ---------------------------------------------------------------------------
// 2. Persona Opening Position Schema (Phase 1)
// ---------------------------------------------------------------------------
export const BaseOpeningPositionSchema = z.object({
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
  claimVerificationTable: z
    .array(ClaimVerificationRowSchema)
    .optional()
    .describe('Per-claim check table (statement -> truth value under proposed answer -> pass/fail)'),
  contradictionsFound: z
    .array(z.string())
    .optional()
    .describe('Contradictions detected in the proposed position or claims'),
  selfCheck: z
    .string()
    .optional()
    .describe('Structured self-check verifying no internal contradictions'),
  verifierResultRef: z
    .string()
    .optional()
    .describe('ID or reference of verifier ground truth result if verified'),
});

export type OpeningPositionPayload = z.infer<typeof BaseOpeningPositionSchema>;

export const OpeningPositionSchema: z.ZodType<OpeningPositionPayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    return {
      positionSummary: raw.positionSummary || raw.position || raw.stance || raw.summary || '',
      detailedReasoning:
        raw.detailedReasoning ||
        raw.reasoning ||
        raw.arguments ||
        raw.details ||
        raw.positionSummary ||
        '',
      confidenceScore:
        typeof raw.confidenceScore === 'number'
          ? raw.confidenceScore
          : typeof raw.confidence === 'number'
          ? raw.confidence
          : 70,
      falsificationCondition:
        raw.falsificationCondition ||
        raw.falsification ||
        raw.counterEvidence ||
        'Empirical evidence demonstrating catastrophic divergence or counterproductive outcomes.',
      claimVerificationTable: Array.isArray(raw.claimVerificationTable)
        ? raw.claimVerificationTable
        : Array.isArray(raw.claimVerification)
        ? raw.claimVerification
        : Array.isArray(raw.claims)
        ? raw.claims
        : undefined,
      contradictionsFound: Array.isArray(raw.contradictionsFound)
        ? raw.contradictionsFound
        : Array.isArray(raw.contradictions)
        ? raw.contradictions
        : undefined,
      selfCheck: raw.selfCheck || raw.self_check || undefined,
      verifierResultRef: raw.verifierResultRef || raw.verifierRef || undefined,
    };
  },
  BaseOpeningPositionSchema
);

// ---------------------------------------------------------------------------
// 3. Cross-Examination Turn Schema (Phase 2)
// ---------------------------------------------------------------------------
export const CrossExamActionSchema = z.enum(['AGREE', 'CHALLENGE', 'CONCEDE']);
export type CrossExamActionType = z.infer<typeof CrossExamActionSchema>;

export const BasePeerResponseSchema = z.object({
  targetPersonaId: z
    .string()
    .min(1, 'Target persona ID cannot be empty')
    .describe('The personaId being addressed (e.g. skeptic, optimist)'),
  action: CrossExamActionSchema.describe('Nature of the dialectical engagement'),
  critiqueOrSupport: z
    .string()
    .min(1, 'Critique or support statement cannot be empty')
    .describe('Direct philosophical challenge, agreement, or concession'),
  citedStatementOrLine: z
    .string()
    .optional()
    .describe('Specific statement, constraint, or line cited in the peer critique/support'),
});

export type PeerResponsePayload = z.infer<typeof BasePeerResponseSchema>;

export const PeerResponseSchema: z.ZodType<PeerResponsePayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    let action = 'CHALLENGE';
    const rawAction = (raw.action || raw.type || '').toString().toUpperCase();
    if (rawAction.includes('AGREE')) action = 'AGREE';
    else if (rawAction.includes('CONCEDE')) action = 'CONCEDE';
    else if (
      rawAction.includes('CHALLENGE') ||
      rawAction.includes('DISAGREE') ||
      rawAction.includes('OBJECT')
    )
      action = 'CHALLENGE';

    // Normalize the target persona ID: the LLM may return camelCase or variant
    // spellings (e.g. "systemsThinker", "theContrarian"). Canonicalize them here
    // at the single entry-point before they reach any typed lookup.
    const rawTargetId: string =
      raw.targetPersonaId || raw.personaId || raw.target || 'skeptic';
    const normalizedTargetId: string =
      normalizePersonaId(rawTargetId) ?? rawTargetId;

    return {
      targetPersonaId: normalizedTargetId,
      action,
      critiqueOrSupport:
        raw.critiqueOrSupport ||
        raw.critique ||
        raw.support ||
        raw.comment ||
        raw.response ||
        'Dialectical critique or endorsement provided.',
      citedStatementOrLine:
        raw.citedStatementOrLine || raw.citedStatement || raw.citation || undefined,
    };
  },
  BasePeerResponseSchema
);

export const BaseCrossExamTurnSchema = z.object({
  responsesToPeers: z
    .array(BasePeerResponseSchema)
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
  claimVerificationTable: z
    .array(ClaimVerificationRowSchema)
    .optional()
    .describe('Per-claim check table for the refined position'),
  contradictionsFound: z
    .array(z.string())
    .optional()
    .describe('Any contradictions found in leading answers or proposed position'),
  selfCheck: z
    .string()
    .optional()
    .describe('Structured self-check verifying consistency with verified constraints'),
  verifierResultRef: z
    .string()
    .optional()
    .describe('ID or reference of verifier ground truth result if verified'),
});

export type CrossExamTurnPayload = z.infer<typeof BaseCrossExamTurnSchema>;

export const CrossExamTurnSchema: z.ZodType<CrossExamTurnPayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    let peers = Array.isArray(raw.responsesToPeers)
      ? raw.responsesToPeers
      : Array.isArray(raw.peerResponses)
      ? raw.peerResponses
      : [];

    if (peers.length === 0) {
      peers = [
        {
          targetPersonaId: 'skeptic',
          action: 'CHALLENGE',
          critiqueOrSupport: 'Examining epistemological risks and verification hurdles.',
        },
        {
          targetPersonaId: 'optimist',
          action: 'AGREE',
          critiqueOrSupport: 'Endorsing strategic upside with operational boundary controls.',
        },
      ];
    } else if (peers.length === 1) {
      peers.push({
        targetPersonaId: peers[0].targetPersonaId === 'skeptic' ? 'optimist' : 'skeptic',
        action: 'AGREE',
        critiqueOrSupport: 'Synthesizing complementary perspectives from peer analysis.',
      });
    }

    return {
      responsesToPeers: peers,
      updatedPosition:
        raw.updatedPosition ||
        raw.position ||
        raw.stance ||
        'Refining stance through dialectical synthesis.',
      updatedConfidence:
        typeof raw.updatedConfidence === 'number'
          ? raw.updatedConfidence
          : typeof raw.confidence === 'number'
          ? raw.confidence
          : 70,
      shiftExplanation:
        raw.shiftExplanation ||
        raw.explanation ||
        raw.reasoning ||
        'Incorporating peer cross-examination and balancing risk trade-offs.',
      whatChanged:
        raw.whatChanged ||
        raw.delta ||
        'Refined conditions and calibrated confidence score.',
      claimVerificationTable: Array.isArray(raw.claimVerificationTable)
        ? raw.claimVerificationTable
        : Array.isArray(raw.claimVerification)
        ? raw.claimVerification
        : Array.isArray(raw.claims)
        ? raw.claims
        : undefined,
      contradictionsFound: Array.isArray(raw.contradictionsFound)
        ? raw.contradictionsFound
        : Array.isArray(raw.contradictions)
        ? raw.contradictions
        : undefined,
      selfCheck: raw.selfCheck || raw.self_check || undefined,
      verifierResultRef: raw.verifierResultRef || raw.verifierRef || undefined,
    };
  },
  BaseCrossExamTurnSchema
);

// ---------------------------------------------------------------------------
// 4. Convergence Check Schema (Phase 3)
// ---------------------------------------------------------------------------
export const BaseConvergenceCheckSchema = z.object({
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
  outcomeConsensusReached: z
    .boolean()
    .describe('True ONLY when every active member names the same concrete outcome entity (same patient, yes/no, same action). False if ANY member names a different outcome.'),
});

export type ConvergenceCheckPayload = z.infer<typeof BaseConvergenceCheckSchema>;

export const ConvergenceCheckSchema: z.ZodType<ConvergenceCheckPayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    return {
      draftConsensusStatement:
        raw.draftConsensusStatement ||
        raw.consensusStatement ||
        raw.draft ||
        raw.summary ||
        'The council is progressing towards synthesis across core principles.',
      remainingDisagreements: Array.isArray(raw.remainingDisagreements)
        ? raw.remainingDisagreements
        : [],
      convergenceScore:
        typeof raw.convergenceScore === 'number'
          ? raw.convergenceScore
          : typeof raw.score === 'number'
          ? raw.score
          : 75,
      keyAlignmentPoints:
        Array.isArray(raw.keyAlignmentPoints) && raw.keyAlignmentPoints.length > 0
          ? raw.keyAlignmentPoints
          : ['Agreement on systematic mitigation and baseline verification'],
      outcomeConsensusReached:
        typeof raw.outcomeConsensusReached === 'boolean'
          ? raw.outcomeConsensusReached
          : false,
    };
  },
  BaseConvergenceCheckSchema
);

// ---------------------------------------------------------------------------
// 5. Ratification Vote Schema (Phase 4)
// ---------------------------------------------------------------------------
export const RatificationVoteTypeSchema = z.enum([
  'SIGN_OFF',
  'SIGN_OFF_WITH_AMENDMENT',
  'OBJECT',
]);

export type RatificationVoteEnum = z.infer<typeof RatificationVoteTypeSchema>;

export const BaseRatificationVoteSchema = z.object({
  vote: RatificationVoteTypeSchema.describe('Ratification vote decision'),
  amendmentSuggestion: z
    .string()
    .optional()
    .describe(
      'Proposed modification text required for sign-off (if SIGN_OFF_WITH_AMENDMENT)'
    ),
  objectionReason: z
    .string()
    .optional()
    .describe(
      'Irreconcilable philosophical or factual flaw preventing sign-off (if OBJECT)'
    ),
  closingComment: z
    .string()
    .min(1, 'Closing comment cannot be empty')
    .describe('Final remarks on the consensus statement'),
  claimVerificationTable: z
    .array(ClaimVerificationRowSchema)
    .optional()
    .describe('Per-claim check table for the draft consensus'),
  contradictionsFound: z
    .array(z.string())
    .optional()
    .describe('Contradictions detected in the draft consensus statement'),
  verifierResultRef: z
    .string()
    .optional()
    .describe('ID or reference of verifier ground truth result if verified'),
});

export type RatificationVotePayload = z.infer<typeof BaseRatificationVoteSchema>;

export const RatificationVoteSchema: z.ZodType<RatificationVotePayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    let vote = 'SIGN_OFF';
    const rawVote = (raw.vote || '').toString().toUpperCase();
    if (rawVote.includes('AMEND')) vote = 'SIGN_OFF_WITH_AMENDMENT';
    else if (rawVote.includes('OBJECT')) vote = 'OBJECT';
    else vote = 'SIGN_OFF';

    return {
      vote,
      amendmentSuggestion: raw.amendmentSuggestion || raw.amendment || undefined,
      objectionReason: raw.objectionReason || raw.objection || undefined,
      closingComment:
        raw.closingComment ||
        raw.comment ||
        raw.summary ||
        `Persona vote recorded as ${vote}.`,
      claimVerificationTable: Array.isArray(raw.claimVerificationTable)
        ? raw.claimVerificationTable
        : Array.isArray(raw.claimVerification)
        ? raw.claimVerification
        : Array.isArray(raw.claims)
        ? raw.claims
        : undefined,
      contradictionsFound: Array.isArray(raw.contradictionsFound)
        ? raw.contradictionsFound
        : Array.isArray(raw.contradictions)
        ? raw.contradictions
        : undefined,
      verifierResultRef: raw.verifierResultRef || raw.verifierRef || undefined,
    };
  },
  BaseRatificationVoteSchema
);

// ---------------------------------------------------------------------------
// 6. Final Synthesis Schema (Phase 5)
// ---------------------------------------------------------------------------
export const BaseFinalSynthesisSchema = z.object({
  verdictOneLiner: z
    .string()
    .min(1, 'Verdict one-liner cannot be empty')
    .describe('Single definitive sentence — the council\'s bottom-line answer, max 15 words'),
  unanimousConclusion: z
    .string()
    .min(1, 'Conclusion cannot be empty')
    .describe('Concise 2-3 sentence paragraph explaining the reasoning behind the verdict'),
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

export type FinalSynthesisPayload = z.infer<typeof BaseFinalSynthesisSchema>;

export const FinalSynthesisSchema: z.ZodType<FinalSynthesisPayload, any, any> = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    return {
      verdictOneLiner:
        raw.verdictOneLiner ||
        raw.oneLiner ||
        raw.headline ||
        // fallback: first sentence of the conclusion
        (raw.unanimousConclusion || raw.conclusion || '').split(/[.!?]/)[0]?.trim() + '.' ||
        'The council has reached its conclusion.',
      unanimousConclusion:
        raw.unanimousConclusion ||
        raw.conclusion ||
        raw.verdict ||
        raw.summary ||
        'The council has rendered its synthesis based on rigorous deliberation.',
      consensusReached:
        typeof raw.consensusReached === 'boolean' ? raw.consensusReached : true,
      keyReasons:
        Array.isArray(raw.keyReasons) && raw.keyReasons.length > 0
          ? raw.keyReasons
          : ['Comprehensive multi-archetype deliberation and verification of constraints'],
      mainCaveats: Array.isArray(raw.mainCaveats)
        ? raw.mainCaveats
        : ['Monitor second-order impacts and changing operational assumptions'],
      actionableGuidance:
        Array.isArray(raw.actionableGuidance) && raw.actionableGuidance.length > 0
          ? raw.actionableGuidance
          : ['Implement recommended staged execution with transparent milestone reviews'],
    };
  },
  BaseFinalSynthesisSchema
);

// ---------------------------------------------------------------------------
// 7. Session Options & Creation Request Schemas
// ---------------------------------------------------------------------------
export const SessionOptionsSchema = z.object({
  maxCrossExamRounds: z.number().int().min(1).max(8).default(3),
  maxRatificationCycles: z.number().int().min(1).max(3).default(2),
  concurrencyLimit: z.number().int().min(1).max(8).default(4),
  callBudget: z.number().int().min(20).max(150).default(80),
  sessionTimeoutMs: z.number().int().min(30000).max(1800000).default(600000),
  mockMode: z.boolean().default(false),
  apiKey: z.string().optional(),
  modelId: z.string().optional(),
  mockDelayMs: z.number().optional(),
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

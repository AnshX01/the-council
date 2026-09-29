/**
 * The Council - Deterministic Template Fallbacks
 *
 * Provides resilient, deterministic template fallbacks if the Moderator's
 * LLM generation encounters unrecoverable API failures.
 */

import {
  FramingArtifact,
  ConvergenceDraft,
  FinalVerdict,
  RatificationVote,
  SurvivingObjection,
} from '@/types/session';
import { PersonaId } from '@/types/persona';

/**
 * Fallback framing when moderator call fails
 */
export function generateFallbackFraming(query: string): FramingArtifact {
  return {
    restatedQuestion: `Deliberation on the strategic and ethical dimensions of: "${query.slice(0, 150)}${query.length > 150 ? '...' : ''}"`,
    coreDecisions: [
      'Evaluation of immediate feasibility vs long-term risk',
      'Balancing individual autonomy and collective welfare',
      'Assessing precedent and irreversible consequences',
    ],
    fundamentalAssumptions: [
      'The dilemma requires multi-disciplinary evaluation',
      'Resource and moral trade-offs exist under uncertainty',
    ],
    deliberationBounds:
      'Focus exclusively on practical, strategic, and ethical vectors without extraneous speculation.',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fallback convergence check when moderator call fails
 */
export function generateFallbackConvergence(
  roundNumber: number,
  alignmentScore: number,
  varianceScore: number
): {
  draftConsensusStatement: string;
  remainingDisagreements: string[];
  convergenceScore: number;
  keyAlignmentPoints: string[];
} {
  return {
    draftConsensusStatement: `The council is progressing through round ${roundNumber}. Members agree on core risk mitigation while continuing to debate optimal prioritization and execution trade-offs.`,
    remainingDisagreements: [
      'Divergence between risk-averse skepticism and growth-oriented optimism',
      'Balancing immediate pragmatism against broader systemic impacts',
    ],
    convergenceScore: Math.round(alignmentScore),
    keyAlignmentPoints: [
      'Commitment to rigorous evaluation before action',
      'Recognition of human and ethical factors in decision outcomes',
    ],
  };
}

/**
 * Fallback revised draft when moderator revision fails
 */
export function generateFallbackRevisedDraft(
  currentDraft: string,
  votes: Record<string, RatificationVote>
): string {
  const amendments = Object.values(votes)
    .filter((v) => v.vote === 'SIGN_OFF_WITH_AMENDMENT' && v.amendmentText)
    .map((v) => v.amendmentText!)
    .join('; ');

  if (amendments) {
    return `${currentDraft} Incorporating council stipulations: ${amendments}.`;
  }
  return currentDraft;
}

/**
 * Fallback final synthesis when moderator final output call fails
 */
export function generateFallbackFinalSynthesis(
  rawQuery: string,
  finalDraft: string,
  isUnanimous: boolean,
  votes: Record<string, RatificationVote>
): {
  unanimousConclusion: string;
  consensusReached: boolean;
  keyReasons: string[];
  mainCaveats: string[];
  actionableGuidance: string[];
} {
  const objections = Object.entries(votes)
    .filter(([_, v]) => v.vote === 'OBJECT')
    .map(([id, v]) => `${id}: ${v.objectionReason || 'Substantive objection'}`);

  return {
    unanimousConclusion: isUnanimous
      ? `The Council has reached a unanimous conclusion: ${finalDraft}`
      : `The Council concluded with consensus not fully reached. Primary majority position: ${finalDraft}. Persistent objections noted: ${objections.join('; ')}`,
    consensusReached: isUnanimous,
    keyReasons: [
      'Multi-perspective scrutiny balanced optimism with rigorous empirical verification',
      'Systemic second-order consequences and ethical safeguards were prioritized',
      'Actionable milestones were calibrated against operational reality',
    ],
    mainCaveats: [
      'Implementation must remain alert to unexpected feedback loops and changing baselines',
      'Continual monitoring of human wellbeing and ethical impacts is imperative',
    ],
    actionableGuidance: [
      '1. Validate assumptions against concrete pilot data before full commitment',
      '2. Establish clear guardrails and threshold triggers for course correction',
      '3. Align stakeholder incentives and transparently communicate rationale',
    ],
  };
}

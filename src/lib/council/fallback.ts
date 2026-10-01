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
  outcomeConsensusReached: boolean;
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
    outcomeConsensusReached: alignmentScore >= 90,
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
  verdictOneLiner: string;
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
    verdictOneLiner: isUnanimous
      ? `The Council unanimously concludes: proceed with the majority position.`
      : `Consensus not reached — majority favors proceeding with noted objections.`,
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

/**
 * Fallback cross-examination turn when persona LLM call is throttled or rate-limited
 */
export function generateFallbackCrossExamTurn(
  personaId: PersonaId,
  roundNumber: number,
  previousPos: string,
  previousConf: number,
  availablePeerIds: PersonaId[]
): {
  responsesToPeers: {
    targetPersonaId: string;
    action: 'AGREE' | 'CHALLENGE' | 'CONCEDE';
    critiqueOrSupport: string;
  }[];
  updatedPosition: string;
  updatedConfidence: number;
  shiftExplanation: string;
  whatChanged: string;
} {
  const targetPeers = availablePeerIds.filter((p) => p !== personaId).slice(0, 2);
  const p1 = targetPeers[0] || 'skeptic';
  const p2 = targetPeers[1] || 'pragmatist';

  return {
    responsesToPeers: [
      {
        targetPersonaId: p1,
        action: 'CHALLENGE',
        critiqueOrSupport: `@${p1.charAt(0).toUpperCase() + p1.slice(1)}, we must rigorously verify whether your core assumptions hold under empirical strain before committing.`,
      },
      {
        targetPersonaId: p2,
        action: 'AGREE',
        critiqueOrSupport: `@${p2.charAt(0).toUpperCase() + p2.slice(1)}, I agree with your operational framing here, provided we preserve foundational safeguards.`,
      },
    ],
    updatedPosition:
      previousPos || `Refining stance to synthesize ${personaId} priorities with ongoing chamber feedback.`,
    updatedConfidence: Math.max(50, Math.min(95, previousConf + (roundNumber % 2 === 0 ? 2 : -1))),
    shiftExplanation: 'Balancing dialectical arguments while safeguarding core architectural values.',
    whatChanged: `Calibrated operational safeguards in light of peer deliberations in round ${roundNumber}.`,
  };
}

/**
 * Fallback ratification vote when persona LLM call encounters rate limits
 */
export function generateFallbackRatificationVote(
  personaId: PersonaId,
  currentDraft: string
): {
  vote: 'SIGN_OFF' | 'SIGN_OFF_WITH_AMENDMENT' | 'OBJECT';
  amendmentSuggestion?: string;
  objectionReason?: string;
  closingComment: string;
} {
  return {
    vote: 'SIGN_OFF',
    closingComment: `Endorsed: the synthesized consensus statement sufficiently balances core ${personaId} priorities with the overall chamber synthesis.`,
  };
}

/**
 * Fallback opening position when persona LLM call is throttled or rate-limited
 */
export function generateFallbackOpeningPosition(
  personaId: PersonaId,
  query: string
): {
  positionSummary: string;
  detailedReasoning: string;
  confidenceScore: number;
  falsificationCondition: string;
} {
  return {
    positionSummary: `From the analytical perspective of ${personaId}, addressing this inquiry requires maintaining strict foundational integrity and balancing core trade-offs.`,
    detailedReasoning: `Evaluating "${query.slice(0, 100)}" by grounding assumptions in verifiable empirical constraints and prioritizing systemic resilience.`,
    confidenceScore: 80,
    falsificationCondition:
      'Rigorous demonstration that baseline empirical assumptions or architectural constraints do not hold.',
  };
}

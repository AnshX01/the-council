/**
 * The Council - Convergence Engine & Quantitative Analytics
 *
 * Implements rigorous mathematical evaluation of council convergence:
 * - Mean confidence across council personas
 * - Variance and standard deviation of stances
 * - Dialectical agreement ratio from cross-examination turns
 * - Round-over-round shift distance
 * - Unified alignment score (0 - 100)
 */

import { CrossExamAction, RatificationVoteType } from '@/types/session';

export interface ConvergenceMetrics {
  meanConfidence: number;
  variance: number;
  standardDeviation: number;
  agreementRatio: number;
  alignmentScore: number;
  shiftDistance: number;
  memberScores: Record<string, number>;
}

/**
 * Calculates arithmetic mean of a numeric array.
 */
export function calculateMean(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / values.length).toFixed(2));
}

/**
 * Calculates population variance of a numeric array.
 * Formula: sigma^2 = (1 / N) * sum((x_i - mu)^2)
 */
export function calculateVariance(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  return Number(variance.toFixed(2));
}

/**
 * Calculates standard deviation.
 * Formula: sigma = sqrt(variance)
 */
export function calculateStandardDeviation(values: number[]): number {
  return Number(Math.sqrt(calculateVariance(values)).toFixed(2));
}

/**
 * Calculates dialectical agreement ratio from actions in cross-examination.
 * Weights:
 * - AGREE: 1.0 (Direct alignment)
 * - CONCEDE: 0.8 (Constructive softening / movement toward consensus)
 * - CHALLENGE: 0.0 (Adversarial friction)
 */
export function calculateAgreementRatio(actions: CrossExamAction[]): number {
  if (!actions || actions.length === 0) return 0.5; // Neutral default

  let weightedSum = 0;
  for (const action of actions) {
    if (action === 'AGREE') weightedSum += 1.0;
    else if (action === 'CONCEDE') weightedSum += 0.8;
    else if (action === 'CHALLENGE') weightedSum += 0.0;
  }

  return Number((weightedSum / actions.length).toFixed(3));
}

/**
 * Calculates ratification sign-off ratio from votes.
 * Weights:
 * - SIGN_OFF: 1.0
 * - SIGN_OFF_WITH_AMENDMENT: 0.5
 * - OBJECT: 0.0
 */
export function calculateRatificationRatio(votes: RatificationVoteType[]): number {
  if (!votes || votes.length === 0) return 0;

  let weightedSum = 0;
  for (const vote of votes) {
    if (vote === 'SIGN_OFF') weightedSum += 1.0;
    else if (vote === 'SIGN_OFF_WITH_AMENDMENT') weightedSum += 0.5;
    else if (vote === 'OBJECT') weightedSum += 0.0;
  }

  return Number((weightedSum / votes.length).toFixed(3));
}

/**
 * Calculates mean round-over-round shift distance between confidence maps.
 * Formula: (1 / |P|) * sum(|curr_p - prev_p|)
 */
export function calculateShiftDistance(
  prevConfidences: Record<string, number>,
  currConfidences: Record<string, number>
): number {
  const commonKeys = Object.keys(prevConfidences).filter(
    (key) => key in currConfidences
  );

  if (commonKeys.length === 0) return 0;

  const totalShift = commonKeys.reduce((acc, key) => {
    return acc + Math.abs(currConfidences[key] - prevConfidences[key]);
  }, 0);

  return Number((totalShift / commonKeys.length).toFixed(2));
}

export interface AlignmentCalculationParams {
  confidences: number[];
  agreementRatio?: number;
  voteSignOffRatio?: number;
}

/**
 * Calculates the comprehensive alignment score (0 - 100).
 *
 * Factors:
 * 1. Normalized Variance Factor (V_norm):
 *    Maximum possible variance for [0, 100] is 2500.
 *    V_norm = max(0, 1 - (variance / 2500))
 * 2. Normalized Mean Confidence (C_norm):
 *    mean / 100
 * 3. Dialectical Agreement / Ratification Factor (A_norm):
 *    Agreement ratio or Ratification sign-off ratio
 */
export function calculateAlignmentScore(params: AlignmentCalculationParams): number {
  const { confidences, agreementRatio, voteSignOffRatio } = params;

  if (!confidences || confidences.length === 0) return 0;

  const mean = calculateMean(confidences);
  const variance = calculateVariance(confidences);

  // Normalized variance: 1.0 = perfect unanimity of confidence, 0.0 = maximal dispersion
  const vNorm = Math.max(0, 1 - variance / 2500);
  const cNorm = Math.min(1, Math.max(0, mean / 100));

  let score: number;

  if (typeof voteSignOffRatio === 'number') {
    // Ratification phase: heavily weight concrete sign-offs
    const rNorm = Math.min(1, Math.max(0, voteSignOffRatio));
    score = 0.5 * rNorm + 0.3 * vNorm + 0.2 * cNorm;
  } else if (typeof agreementRatio === 'number') {
    // Cross-examination phase: balance agreement ratio, low variance, and mean confidence
    const aNorm = Math.min(1, Math.max(0, agreementRatio));
    score = 0.25 * aNorm + 0.45 * vNorm + 0.30 * cNorm;
  } else {
    // Opening phase: variance and confidence only
    score = 0.6 * vNorm + 0.4 * cNorm;
  }

  const scaled = Math.round(score * 100);
  return Math.min(100, Math.max(0, scaled));
}

/**
 * Computes all convergence metrics across active personas for a round or phase.
 */
export function evaluateConvergence(params: {
  confidenceMap: Record<string, number>;
  prevConfidenceMap?: Record<string, number>;
  actions?: CrossExamAction[];
  votes?: RatificationVoteType[];
}): ConvergenceMetrics {
  const { confidenceMap, prevConfidenceMap, actions, votes } = params;
  const confidences = Object.values(confidenceMap);

  const meanConfidence = calculateMean(confidences);
  const variance = calculateVariance(confidences);
  const standardDeviation = calculateStandardDeviation(confidences);

  const agreementRatio = actions ? calculateAgreementRatio(actions) : 0.5;
  const voteSignOffRatio = votes ? calculateRatificationRatio(votes) : undefined;

  const shiftDistance = prevConfidenceMap
    ? calculateShiftDistance(prevConfidenceMap, confidenceMap)
    : 0;

  const alignmentScore = calculateAlignmentScore({
    confidences,
    agreementRatio: actions ? agreementRatio : undefined,
    voteSignOffRatio,
  });

  // Calculate per-member agreement score: how close their confidence is to the mean
  const memberScores: Record<string, number> = {};
  for (const [id, conf] of Object.entries(confidenceMap)) {
    const diff = Math.abs(conf - meanConfidence);
    memberScores[id] = Math.max(0, Math.round(100 - diff));
  }

  return {
    meanConfidence,
    variance,
    standardDeviation,
    agreementRatio,
    alignmentScore,
    shiftDistance,
    memberScores,
  };
}

/**
 * High-level helper extracting session metrics for state machine convergence checks.
 */
export function calculateConvergenceMetrics(session: any): {
  alignmentScore: number;
  varianceScore: number;
  memberAgreementScores: Record<string, number>;
} {
  const latestRound = session.crossExamRounds[session.crossExamRounds.length - 1];
  const confidenceMap: Record<string, number> = {};
  const actions: CrossExamAction[] = [];

  if (latestRound) {
    for (const [id, turn] of Object.entries(latestRound.turns) as [string, any][]) {
      confidenceMap[id] = turn.updatedConfidence;
      if (turn.responses) {
        for (const resp of turn.responses) {
          actions.push(resp.action);
        }
      }
    }
  } else {
    for (const [id, pos] of Object.entries(session.openingPositions) as [string, any][]) {
      if (pos) confidenceMap[id] = pos.confidenceScore;
    }
  }

  const prevRound = session.crossExamRounds[session.crossExamRounds.length - 2];
  let prevConfidenceMap: Record<string, number> | undefined;
  if (prevRound) {
    prevConfidenceMap = {};
    for (const [id, turn] of Object.entries(prevRound.turns) as [string, any][]) {
      prevConfidenceMap[id] = turn.updatedConfidence;
    }
  }

  const result = evaluateConvergence({
    confidenceMap,
    prevConfidenceMap,
    actions: actions.length > 0 ? actions : undefined,
  });

  return {
    alignmentScore: result.alignmentScore,
    varianceScore: result.variance,
    memberAgreementScores: result.memberScores,
  };
}

/**
 * Calculates a structured shift record with confidence delta.
 */
export function calculateShiftRecord(params: {
  personaId: string;
  roundNumber: number;
  previousPosition: string;
  newPosition: string;
  previousConfidence: number;
  newConfidence: number;
  catalystPersonaIds: string[];
  shiftRationale: string;
}): any {
  return {
    ...params,
    deltaConfidence: params.newConfidence - params.previousConfidence,
    timestamp: new Date().toISOString(),
  };
}

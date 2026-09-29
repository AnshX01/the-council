import { describe, it, expect } from 'vitest';
import {
  calculateMean,
  calculateVariance,
  calculateStandardDeviation,
  calculateAgreementRatio,
  calculateRatificationRatio,
  calculateShiftDistance,
  calculateAlignmentScore,
  evaluateConvergence,
} from '@/lib/council/convergence';

describe('Convergence Engine Math & Analytics', () => {
  describe('calculateMean', () => {
    it('returns 0 for empty array', () => {
      expect(calculateMean([])).toBe(0);
    });

    it('returns exact value for single element', () => {
      expect(calculateMean([85])).toBe(85);
    });

    it('computes correct mean for multiple values', () => {
      expect(calculateMean([80, 90, 70])).toBe(80);
      expect(calculateMean([10, 20, 30, 40])).toBe(25);
    });
  });

  describe('calculateVariance and calculateStandardDeviation', () => {
    it('returns 0 variance for identical values', () => {
      expect(calculateVariance([50, 50, 50])).toBe(0);
      expect(calculateStandardDeviation([50, 50, 50])).toBe(0);
    });

    it('returns 0 variance for empty or single element array', () => {
      expect(calculateVariance([])).toBe(0);
      expect(calculateVariance([100])).toBe(0);
      expect(calculateStandardDeviation([])).toBe(0);
    });

    it('computes population variance correctly', () => {
      // Data: [10, 20], mean = 15, diffs = [-5, 5], sqDiffs = [25, 25], variance = 50 / 2 = 25
      expect(calculateVariance([10, 20])).toBe(25);
      expect(calculateStandardDeviation([10, 20])).toBe(5);
    });
  });

  describe('calculateAgreementRatio', () => {
    it('returns 0.5 for empty array default', () => {
      expect(calculateAgreementRatio([])).toBe(0.5);
    });

    it('returns 1.0 when all actions are AGREE', () => {
      expect(calculateAgreementRatio(['AGREE', 'AGREE', 'AGREE'])).toBe(1.0);
    });

    it('returns 0.0 when all actions are CHALLENGE', () => {
      expect(calculateAgreementRatio(['CHALLENGE', 'CHALLENGE'])).toBe(0.0);
    });

    it('weights CONCEDE at 0.8', () => {
      expect(calculateAgreementRatio(['CONCEDE', 'CONCEDE'])).toBe(0.8);
      // Mix: AGREE (1.0) + CHALLENGE (0.0) = 1.0 / 2 = 0.5
      expect(calculateAgreementRatio(['AGREE', 'CHALLENGE'])).toBe(0.5);
    });
  });

  describe('calculateRatificationRatio', () => {
    it('returns 0 for empty array', () => {
      expect(calculateRatificationRatio([])).toBe(0);
    });

    it('returns 1.0 for unanimous SIGN_OFF', () => {
      expect(calculateRatificationRatio(['SIGN_OFF', 'SIGN_OFF'])).toBe(1.0);
    });

    it('returns 0.0 for unanimous OBJECT', () => {
      expect(calculateRatificationRatio(['OBJECT', 'OBJECT'])).toBe(0.0);
    });

    it('weights SIGN_OFF_WITH_AMENDMENT at 0.5', () => {
      // 1 sign-off (1.0), 1 amendment (0.5), 1 object (0.0) = 1.5 / 3 = 0.5
      expect(
        calculateRatificationRatio([
          'SIGN_OFF',
          'SIGN_OFF_WITH_AMENDMENT',
          'OBJECT',
        ])
      ).toBe(0.5);
    });
  });

  describe('calculateShiftDistance', () => {
    it('returns 0 if no common keys exist or identical maps', () => {
      expect(calculateShiftDistance({}, {})).toBe(0);
      expect(calculateShiftDistance({ a: 80 }, { a: 80 })).toBe(0);
      expect(calculateShiftDistance({ a: 80 }, { b: 80 })).toBe(0);
    });

    it('computes average absolute difference across common keys', () => {
      const prev = { skeptic: 80, optimist: 70 };
      const curr = { skeptic: 70, optimist: 80 };
      // diff skeptic = 10, diff optimist = 10 -> average = 10
      expect(calculateShiftDistance(prev, curr)).toBe(10);
    });
  });

  describe('calculateAlignmentScore', () => {
    it('returns 0 for empty confidences', () => {
      expect(calculateAlignmentScore({ confidences: [] })).toBe(0);
    });

    it('returns a high score (90+) for high confidence, 0 variance, and full agreement', () => {
      const score = calculateAlignmentScore({
        confidences: [90, 90, 90, 90],
        agreementRatio: 1.0,
      });
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes high variance and challenges', () => {
      const lowScore = calculateAlignmentScore({
        confidences: [10, 90, 20, 85],
        agreementRatio: 0.1,
      });
      const highScore = calculateAlignmentScore({
        confidences: [85, 88, 86, 85],
        agreementRatio: 0.9,
      });
      expect(lowScore).toBeLessThan(highScore);
    });

    it('incorporates ratification sign-off ratio when provided', () => {
      const ratifiedScore = calculateAlignmentScore({
        confidences: [90, 90, 90],
        voteSignOffRatio: 1.0,
      });
      const rejectedScore = calculateAlignmentScore({
        confidences: [90, 90, 90],
        voteSignOffRatio: 0.0,
      });
      expect(ratifiedScore).toBeGreaterThan(rejectedScore);
    });
  });

  describe('evaluateConvergence', () => {
    it('computes full convergence metrics structure correctly', () => {
      const confidenceMap = {
        skeptic: 80,
        optimist: 85,
        pragmatist: 80,
      };
      const prevConfidenceMap = {
        skeptic: 70,
        optimist: 80,
        pragmatist: 75,
      };

      const result = evaluateConvergence({
        confidenceMap,
        prevConfidenceMap,
        actions: ['AGREE', 'CONCEDE', 'AGREE'],
      });

      expect(result.meanConfidence).toBeCloseTo(81.67, 1);
      expect(result.variance).toBeGreaterThan(0);
      expect(result.standardDeviation).toBeGreaterThan(0);
      expect(result.agreementRatio).toBeGreaterThan(0.5);
      expect(result.alignmentScore).toBeGreaterThan(70);
      expect(result.shiftDistance).toBeCloseTo(6.67, 1);
      expect(result.memberScores).toHaveProperty('skeptic');
      expect(result.memberScores).toHaveProperty('optimist');
      expect(result.memberScores).toHaveProperty('pragmatist');
    });
  });
});

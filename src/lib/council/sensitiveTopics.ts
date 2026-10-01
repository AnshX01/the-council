/**
 * The Council - Sensitive Topic Detection & Supportive Advisory
 *
 * Scans deliberation questions for emergency, health, legal, and crisis
 * vectors to ensure responsible, compassionate, and non-prescriptive framing.
 */

export interface SensitiveTopicAssessment {
  isSensitive: boolean;
  category: 'crisis' | 'medical' | 'legal' | 'financial' | null;
  notice: string | null;
  resources?: { name: string; contact: string }[];
}

const CRISIS_PATTERNS = [
  /suicid/i,
  /kill\s+myself/i,
  /end\s+my\s+life/i,
  /self[- ]harm/i,
  /cutting\s+myself/i,
  /want\s+to\s+die/i,
];

const MEDICAL_PATTERNS = [
  /diagnos/i,
  /prescrib/i,
  /dosage/i,
  /chest\s+pain/i,
  /stroke\s+symptoms/i,
  /should\s+i\s+take\s+\w+\s+(medication|pill|dose)/i,
];

const LEGAL_PATTERNS = [
  /commit\s+a\s+crime/i,
  /lawsuit\s+strategy/i,
  /plead\s+guilty/i,
  /evade\s+taxes/i,
];

const FINANCIAL_PATTERNS = [
  /all[- ]in\s+on\s+crypto/i,
  /liquidate\s+entire\s+life\s+savings/i,
  /bankruptcy\s+fraud/i,
];

export function assessTopicSensitivity(query: string): SensitiveTopicAssessment {
  const text = query.trim();

  // 1. Crisis / Self-Harm check
  if (CRISIS_PATTERNS.some((p) => p.test(text))) {
    return {
      isSensitive: true,
      category: 'crisis',
      notice:
        'IMPORTANT CRISIS RESOURCE: If you or someone you know is going through a difficult time or experiencing thoughts of self-harm, please reach out for compassionate, free, and confidential support.',
      resources: [
        { name: '988 Suicide & Crisis Lifeline (US/Canada)', contact: 'Call or text 988' },
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
        { name: 'International Resources (Befrienders)', contact: 'https://www.befrienders.org' },
      ],
    };
  }

  // 2. Medical emergency / advice check
  if (MEDICAL_PATTERNS.some((p) => p.test(text))) {
    return {
      isSensitive: true,
      category: 'medical',
      notice:
        'NOT PROFESSIONAL MEDICAL ADVICE: The Council is an analytical deliberation simulator. It cannot provide clinical diagnoses or medical recommendations. Please consult a licensed medical professional.',
    };
  }

  // 3. Legal emergency / advice check
  if (LEGAL_PATTERNS.some((p) => p.test(text))) {
    return {
      isSensitive: true,
      category: 'legal',
      notice:
        'NOT FORMAL LEGAL COUNSEL: The Council analyzes philosophical and strategic trade-offs, not legal statutes. Consult an attorney for binding legal counsel.',
    };
  }

  // 4. Acute financial risk check
  if (FINANCIAL_PATTERNS.some((p) => p.test(text))) {
    return {
      isSensitive: true,
      category: 'financial',
      notice:
        'NOT LICENSED FINANCIAL ADVICE: This deliberation examines decision architecture. Consult a certified financial fiduciary regarding personal financial allocations.',
    };
  }

  return {
    isSensitive: false,
    category: null,
    notice: null,
  };
}

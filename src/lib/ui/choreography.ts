/**
 * The Council — Round Table Choreographer
 * Origin: RT4 §2 Animation and interaction lifecycle coordinator.
 * Manages timing constants, spring curves, arc lifecycle states, and speaker spotlight transitions.
 */

export const CHOREOGRAPHY = {
  // Spring configurations matching Atlas design language
  springs: {
    snappy: { type: 'spring', stiffness: 500, damping: 30 },
    gentle: { type: 'spring', stiffness: 300, damping: 25 },
    bounce: { type: 'spring', stiffness: 400, damping: 15 },
  },

  // Timings (ms)
  durations: {
    turnTransition: 400,
    arcDraw: 600,
    arcParticlePulse: 1500,
    arcTrailFade: 1200,
    spotlightFade: 350,
    phaseChangeWash: 800,
    verdictSealReveal: 900,
  },

  // Stance visual encoding
  stances: {
    AGREE: {
      color: 'var(--status-low)',
      symbol: '✓',
      label: 'Agreement',
      dashArray: 'none',
      particleSpeed: '1.2s',
    },
    CHALLENGE: {
      color: 'var(--status-urgent)',
      symbol: '⚡',
      label: 'Challenge',
      dashArray: '6 4',
      particleSpeed: '0.8s',
    },
    CONCEDE: {
      color: 'var(--status-medium)',
      symbol: '✋',
      label: 'Concession',
      dashArray: '2 4',
      particleSpeed: '1.6s',
    },
    NEUTRAL: {
      color: 'var(--text-muted)',
      symbol: '•',
      label: 'Dialogue',
      dashArray: 'none',
      particleSpeed: '1.5s',
    },
  },
} as const;

export type ChoreographyStance = keyof typeof CHOREOGRAPHY.stances;

export function getStanceConfig(stance: string = 'AGREE') {
  const normalized = stance.toUpperCase() as ChoreographyStance;
  return CHOREOGRAPHY.stances[normalized] || CHOREOGRAPHY.stances.AGREE;
}

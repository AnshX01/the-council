/**
 * The Council — Pure UI Data Selectors
 * Origin: Centralized state reducers and selectors for Council deliberation sessions.
 * Guarantees consistent confidence shift calculations, typed transcript items,
 * and eliminates duplicate/raw-event leaks across all chamber components.
 */

import { PersonaId } from '@/types/persona';
import { ALL_PERSONAS } from '@/lib/council/personas';
import { DeliberationPhase, DeliberationSession, FinalVerdict, ShiftRecord } from '@/types/session';
import { CouncilEventType, CouncilSSEEvent } from '@/types/events';

// ── B9: Canonical Phase Definitions ───────────────────────────
export interface PhaseDefinition {
  id: DeliberationPhase;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const PHASES: readonly PhaseDefinition[] = [
  {
    id: 'PHASE_0_FRAMING',
    index: 0,
    label: 'Framing',
    shortLabel: 'Framing',
    description: 'Moderator frames the core dilemma and assigns inquiry angles',
  },
  {
    id: 'PHASE_1_OPENING',
    index: 1,
    label: 'Opening Positions',
    shortLabel: 'Opening',
    description: 'Council members present baseline stances and confidence ratings',
  },
  {
    id: 'PHASE_2_CROSS_EXAM',
    index: 2,
    label: 'Cross-Examination',
    shortLabel: 'Cross-Exam',
    description: 'Iterative direct challenges, concessions, and principle testing',
  },
  {
    id: 'PHASE_3_CONVERGENCE_CHECK',
    index: 3,
    label: 'Convergence Check',
    shortLabel: 'Convergence',
    description: 'Mathematical alignment check toward agreement threshold',
  },
  {
    id: 'PHASE_4_RATIFICATION',
    index: 4,
    label: 'Ratification',
    shortLabel: 'Ratification',
    description: 'Formal roll-call voting on resolution drafts',
  },
  {
    id: 'PHASE_5_FINAL_OUTPUT',
    index: 5,
    label: 'Final Verdict',
    shortLabel: 'Verdict',
    description: 'Final consensus seal, justification pillars, and caveat disclosures',
  },
] as const;

export function selectPhases(currentPhase?: DeliberationPhase) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  return {
    phases: PHASES,
    currentIndex: activeIndex,
    currentPhase: PHASES[activeIndex] || PHASES[0],
    isCompleted: currentPhase === 'PHASE_5_FINAL_OUTPUT',
  };
}

// ── B6: Trajectory Points & Shift Selector ───────────────────
export interface TrajectoryPoint {
  round: number;
  phase: string;
  confidence: number;
}

export interface PersonaTrajectory {
  personaId: PersonaId;
  initialConfidence: number;
  finalConfidence: number;
  delta: number;
  points: TrajectoryPoint[];
  formattedShift: string; // e.g. "85 → 90 (+5)" or "92 → 92 (0)"
  ratificationVote?: 'sign_off' | 'amendment' | 'dissent';
  amendmentReason?: string;
  dissentReason?: string;
}

export function selectConfidenceTrajectories(
  sessionOrEvents: DeliberationSession | CouncilSSEEvent[] | null | undefined
): Record<PersonaId, PersonaTrajectory> {
  const trajectories: Partial<Record<PersonaId, PersonaTrajectory>> = {};

  const personaList: PersonaId[] = [
    'skeptic',
    'optimist',
    'ethicist',
    'pragmatist',
    'systems_thinker',
    'historian',
    'humanist',
    'contrarian',
  ];

  for (const pid of personaList) {
    trajectories[pid] = {
      personaId: pid,
      initialConfidence: 50,
      finalConfidence: 50,
      delta: 0,
      points: [],
      formattedShift: '50 → 50 (0)',
    };
  }

  if (!sessionOrEvents) {
    return trajectories as Record<PersonaId, PersonaTrajectory>;
  }

  // 1. If it's a full DeliberationSession object:
  if ('id' in sessionOrEvents && 'currentPhase' in sessionOrEvents) {
    const session = sessionOrEvents as DeliberationSession;

    // Check opening positions
    if (session.openingPositions) {
      for (const [pid, pos] of Object.entries(session.openingPositions)) {
        const id = pid as PersonaId;
        if (trajectories[id] && typeof pos.confidenceScore === 'number') {
          trajectories[id]!.initialConfidence = pos.confidenceScore;
          trajectories[id]!.finalConfidence = pos.confidenceScore;
          trajectories[id]!.points.push({
            round: 0,
            phase: 'Opening',
            confidence: pos.confidenceScore,
          });
        }
      }
    }

    // Check cross exam rounds
    if (session.crossExamRounds && Array.isArray(session.crossExamRounds)) {
      session.crossExamRounds.forEach((round, rIdx) => {
        if (round.turns) {
          const turns = Array.isArray(round.turns) ? round.turns : Object.values(round.turns);
          turns.forEach((turn: any) => {
            const id = (turn.speakerPersonaId || turn.personaId) as PersonaId;
            if (trajectories[id] && typeof turn.updatedConfidence === 'number') {
              trajectories[id]!.finalConfidence = turn.updatedConfidence;
              trajectories[id]!.points.push({
                round: rIdx + 1,
                phase: `Round ${rIdx + 1}`,
                confidence: turn.updatedConfidence,
              });
            }
          });
        }
      });
    }

    // Check positionShiftHistory / finalVerdict
    if (session.positionShiftHistory && session.positionShiftHistory.length > 0) {
      for (const shift of session.positionShiftHistory) {
        const s = shift as any;
        const id = s.personaId as PersonaId;
        if (trajectories[id]) {
          trajectories[id]!.initialConfidence = s.initialConfidence ?? s.previousConfidence ?? trajectories[id]!.initialConfidence;
          trajectories[id]!.finalConfidence = s.finalConfidence ?? s.newConfidence ?? trajectories[id]!.finalConfidence;
        }
      }
    }

    // Check ratification votes
    if (session.ratificationCycles && session.ratificationCycles.length > 0) {
      const lastCycle = session.ratificationCycles[session.ratificationCycles.length - 1];
      if (lastCycle.votes) {
        const votes = Array.isArray(lastCycle.votes) ? lastCycle.votes : Object.values(lastCycle.votes);
        for (const vote of votes) {
          const v = vote as any;
          const id = v.personaId as PersonaId;
          if (trajectories[id]) {
            const rawDec = (v.vote || v.decision || '').toLowerCase();
            const dec = rawDec.includes('amendment') ? 'amendment' : rawDec.includes('object') || rawDec.includes('dissent') ? 'dissent' : 'sign_off';
            trajectories[id]!.ratificationVote = dec;
            if (dec === 'amendment') {
              trajectories[id]!.amendmentReason = v.amendmentText || v.proposedAmendment;
            } else if (dec === 'dissent') {
              trajectories[id]!.dissentReason = v.objectionReason || v.objectionPrinciple;
            }
          }
        }
      }
    }
  } else if (Array.isArray(sessionOrEvents)) {
    // 2. If it's an array of CouncilSSEEvents:
    for (const ev of sessionOrEvents) {
      if (!ev || !ev.event) continue;

      if (ev.event === 'persona_message') {
        const p = ev.payload as any;
        const id = p.personaId as PersonaId;
        if (id && trajectories[id] && typeof p.confidenceScore === 'number') {
          if (trajectories[id]!.points.length === 0) {
            trajectories[id]!.initialConfidence = p.confidenceScore;
          }
          trajectories[id]!.finalConfidence = p.confidenceScore;
          trajectories[id]!.points.push({
            round: p.roundNumber || 0,
            phase: p.phase || 'Debate',
            confidence: p.confidenceScore,
          });
        }
      } else if (ev.event === 'position_update') {
        const p = ev.payload as any;
        const id = p.personaId as PersonaId;
        if (id && trajectories[id] && typeof p.newConfidence === 'number') {
          trajectories[id]!.finalConfidence = p.newConfidence;
          trajectories[id]!.points.push({
            round: p.roundNumber || 0,
            phase: `Round ${p.roundNumber || 1}`,
            confidence: p.newConfidence,
          });
        }
      } else if (ev.event === 'ratification_vote') {
        const p = ev.payload as any;
        const id = p.personaId as PersonaId;
        if (id && trajectories[id]) {
          trajectories[id]!.ratificationVote = p.decision;
          if (p.decision === 'amendment') {
            trajectories[id]!.amendmentReason = p.proposedAmendment;
          } else if (p.decision === 'dissent') {
            trajectories[id]!.dissentReason = p.objectionPrinciple;
          }
        }
      }
    }
  }

  // Calculate deltas and format strings
  for (const pid of personaList) {
    const t = trajectories[pid]!;
    const delta = t.finalConfidence - t.initialConfidence;
    t.delta = delta;
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    t.formattedShift = `${t.initialConfidence} → ${t.finalConfidence} (${sign})`;
  }

  return trajectories as Record<PersonaId, PersonaTrajectory>;
}

// ── Seat States Selector ──────────────────────────────────────
export interface SeatState {
  personaId: PersonaId;
  seatNumber: number;
  status: 'idle' | 'thinking' | 'speaking' | 'unavailable';
  confidence: number;
  delta: number;
  formattedShift: string;
  isSpeaking: boolean;
  isAddressed: boolean;
  lastStance?: 'AGREE' | 'CHALLENGE' | 'CONCEDE' | 'NEUTRAL' | string;
  targetPersonaId?: PersonaId;
  ballot?: 'sign_off' | 'amendment' | 'dissent';
  unavailableReason?: string;
  lastMessageSnippet?: string;
}

export function selectSeatStates(
  trajectories: Record<PersonaId, PersonaTrajectory>,
  currentSpeakerId?: PersonaId | null,
  activeTargetId?: PersonaId | null,
  activeStance?: 'AGREE' | 'CHALLENGE' | 'CONCEDE' | 'NEUTRAL' | string | null,
  unavailableMap: Partial<Record<PersonaId, string>> = {}
): Record<PersonaId, SeatState> {
  const seats: Partial<Record<PersonaId, SeatState>> = {};

  const personaOrder: PersonaId[] = [
    'moderator',
    'skeptic',
    'ethicist',
    'systems_thinker',
    'contrarian',
    'historian',
    'pragmatist',
    'humanist',
    'optimist',
  ];

  personaOrder.forEach((pid, index) => {
    const isUnavailable = !!unavailableMap[pid];
    const isSpeaking = currentSpeakerId === pid;
    const isAddressed = activeTargetId === pid;
    const traj = pid !== 'moderator' ? trajectories[pid] : null;

    let status: SeatState['status'] = 'idle';
    if (isUnavailable) {
      status = 'unavailable';
    } else if (isSpeaking) {
      status = 'speaking';
    }

    seats[pid] = {
      personaId: pid,
      seatNumber: index,
      status,
      confidence: traj ? traj.finalConfidence : 100,
      delta: traj ? traj.delta : 0,
      formattedShift: traj ? traj.formattedShift : '100',
      isSpeaking,
      isAddressed,
      lastStance: isSpeaking && activeStance ? activeStance : undefined,
      targetPersonaId: isSpeaking && activeTargetId ? activeTargetId : undefined,
      ballot: traj?.ratificationVote,
      unavailableReason: unavailableMap[pid],
    };
  });

  return seats as Record<PersonaId, SeatState>;
}

// ── B7: Typed Transcript Item Selector (No Raw snake_case Events) ───
export type TranscriptItem =
  | {
      type: 'narrative';
      id: string;
      seq?: number;
      timestamp: string;
      personaId: PersonaId;
      phase: DeliberationPhase;
      phaseName: string;
      content: string;
      confidence?: number;
      dialogueType?: 'peer_response' | 'position_statement';
      targetPersonaId?: PersonaId;
      action?: 'AGREE' | 'CHALLENGE' | 'CONCEDE';
    }
  | {
      type: 'system_divider';
      id: string;
      seq?: number;
      timestamp: string;
      label: string;
      detail?: string;
    };

export function selectTranscriptRows(events: CouncilSSEEvent[]): TranscriptItem[] {
  const rows: TranscriptItem[] = [];

  for (const ev of events) {
    if (!ev || !ev.event) continue;

    switch (ev.event) {
      case 'persona_message': {
        const p = ev.payload as any;
        const phaseDef = PHASES.find((ph) => ph.id === p.phase);
        rows.push({
          type: 'narrative',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          personaId: p.personaId,
          phase: p.phase,
          phaseName: phaseDef ? phaseDef.label : 'Deliberation',
          content: p.content,
          confidence: p.confidenceScore,
          dialogueType: p.dialogueType,
          targetPersonaId: p.targetPersonaId,
          action: p.action,
        });
        break;
      }

      case 'phase_started': {
        const p = ev.payload as any;
        const phaseDef = PHASES.find((ph) => ph.id === p.phase);
        rows.push({
          type: 'system_divider',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          label: phaseDef ? phaseDef.label : 'Phase Transition',
          detail: p.description,
        });
        break;
      }

      case 'cross_exam_round_complete': {
        const p = ev.payload as any;
        rows.push({
          type: 'system_divider',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          label: `Cross-Examination Round ${p.roundNumber} Complete`,
          detail: `Round completed with ${p.summary?.activeDebates || 'active'} debate exchanges`,
        });
        break;
      }

      case 'position_update': {
        const p = ev.payload as any;
        const delta = p.deltaConfidence >= 0 ? `+${p.deltaConfidence}` : `${p.deltaConfidence}`;
        const personaName = p.personaId ? p.personaId.replace(/_/g, ' ') : 'Member';
        rows.push({
          type: 'system_divider',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          label: `${personaName.charAt(0).toUpperCase() + personaName.slice(1)}: ${p.previousConfidence}% → ${p.newConfidence}% (${delta}%)`,
          detail: p.newPosition ? `Stance: ${p.newPosition}` : undefined,
        });
        break;
      }

      case 'ratification_vote': {
        const p = ev.payload as any;
        const personaName = p.personaId ? p.personaId.replace(/_/g, ' ') : 'Member';
        const voteLabel =
          p.decision === 'sign_off'
            ? 'Signed off on draft resolution'
            : p.decision === 'amendment'
            ? 'Filed amendment to resolution'
            : 'Formally dissented from resolution';
        rows.push({
          type: 'system_divider',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          label: `${personaName.charAt(0).toUpperCase() + personaName.slice(1)}: ${voteLabel}`,
          detail: p.proposedAmendment || p.objectionPrinciple,
        });
        break;
      }

      case 'persona_unavailable': {
        const p = ev.payload as any;
        const personaName = p.personaId ? p.personaId.replace(/_/g, ' ') : 'Member';
        rows.push({
          type: 'system_divider',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          label: `${personaName.charAt(0).toUpperCase() + personaName.slice(1)} unavailable`,
          detail: p.reason || 'Persona failed or timed out; deliberation proceeding with remaining quorum',
        });
        break;
      }

      case 'final_verdict': {
        const p = ev.payload as any;
        const statusLabel =
          p.verdictType === 'UNANIMOUS'
            ? 'Unanimous Resolution Ratified'
            : 'Consensus Not Fully Reached (Dissent Recorded)';
        rows.push({
          type: 'system_divider',
          id: ev.id || `ev-${ev.seq || rows.length}`,
          seq: ev.seq,
          timestamp: ev.timestamp,
          label: `Deliberation Concluded — ${statusLabel}`,
          detail: p.conclusion,
        });
        break;
      }

      case 'moderator_draft':
      case 'ratification_cycle_complete':
      case 'session_error':
      case 'verifier_update':
      case 'done':
      default: {
        // Suppress or handle non-narrative raw technical events cleanly
        break;
      }
    }
  }

  return rows;
}

// ── B8: Clean Verdict Summary & Dissent Record Selectors ─────────
export interface DissentEntry {
  personaId: PersonaId;
  decision: 'amendment' | 'dissent';
  principle: string;
  reason?: string;
  amendment?: string;
}

export function selectDissentRecord(
  sessionOrVerdict?: DeliberationSession | FinalVerdict | null
): DissentEntry[] {
  if (!sessionOrVerdict) return [];

  const verdict = ('status' in sessionOrVerdict || 'verdictType' in sessionOrVerdict || 'verdictOneLiner' in sessionOrVerdict)
    ? (sessionOrVerdict as FinalVerdict)
    : (sessionOrVerdict as DeliberationSession).finalVerdict;

  if (!verdict) return [];

  const dissenters: DissentEntry[] = [];
  const rawList: any[] = verdict.survivingObjections || (verdict as any).dissenters || [];

  if (Array.isArray(rawList)) {
    for (const d of rawList) {
      dissenters.push({
        personaId: d.personaId as PersonaId,
        decision: 'dissent',
        principle: d.irreconcilablePrinciple || d.uncompromisingPrinciple || 'Core ethical boundary reservation',
        reason: d.objectionText || d.coreObjection || 'Dissenting opinion recorded.',
      });
    }
  }

  return dissenters;
}

export interface InteractionPair {
  speakerId: PersonaId;
  targetId: PersonaId;
  count: number;
  agreeCount: number;
  challengeCount: number;
  concedeCount: number;
}

export function selectInteractionMap(events: CouncilSSEEvent[]): InteractionPair[] {
  const map: Map<string, InteractionPair> = new Map();

  for (const ev of events) {
    if (ev.event === 'persona_message') {
      const p = ev.payload as any;
      if (p.speakerId || p.personaId) {
        const speaker = (p.speakerId || p.personaId) as PersonaId;
        const target = p.targetPersonaId as PersonaId;
        if (speaker && target && speaker !== target) {
          const key = `${speaker}->${target}`;
          if (!map.has(key)) {
            map.set(key, {
              speakerId: speaker,
              targetId: target,
              count: 0,
              agreeCount: 0,
              challengeCount: 0,
              concedeCount: 0,
            });
          }
          const pair = map.get(key)!;
          pair.count++;
          if (p.action === 'AGREE') pair.agreeCount++;
          else if (p.action === 'CHALLENGE') pair.challengeCount++;
          else if (p.action === 'CONCEDE') pair.concedeCount++;
        }
      }
    }
  }

  return Array.from(map.values());
}

// ── R4: selectPhaseState Canonical Phase Reducer ──────────────
export interface PhaseState {
  currentPhase: DeliberationPhase;
  phaseIndex: number;
  phaseLabel: string;
  roundNumber: number;
  maxRounds: number;
  isCompleted: boolean;
  isFailed: boolean;
  convergenceScore: number;
  phaseDurations?: Record<string, number>;
}

export function selectPhaseState(events: CouncilSSEEvent[] = []): PhaseState {
  let currentPhase: DeliberationPhase = 'PHASE_0_FRAMING';
  let roundNumber = 1;
  let maxRounds = 3;
  let isCompleted = false;
  let isFailed = false;
  let convergenceScore = 0;
  const phaseDurations: Record<string, number> = {};
  let phaseStartTime = 0;
  let activePhase: string = 'PHASE_0_FRAMING';

  for (const ev of events) {
    const evTime = ev.timestamp ? new Date(ev.timestamp).getTime() : Date.now();

    if (ev.event === 'phase_started') {
      const p = ev.payload;
      if (p.phase) {
        if (phaseStartTime > 0 && activePhase) {
          phaseDurations[activePhase] = (phaseDurations[activePhase] || 0) + (evTime - phaseStartTime);
        }
        currentPhase = p.phase;
        activePhase = p.phase;
        phaseStartTime = evTime;
      }
    } else if (ev.event === 'cross_exam_round_complete') {
      const p = ev.payload;
      if (typeof p.roundNumber === 'number') {
        roundNumber = p.roundNumber;
      }
    } else if (ev.event === 'persona_message') {
      const p = ev.payload;
      if (typeof p.roundNumber === 'number') {
        roundNumber = p.roundNumber;
      }
    } else if (ev.event === 'moderator_draft') {
      const p = ev.payload;
      if (typeof p.alignmentScore === 'number') {
        convergenceScore = p.alignmentScore;
      }
    } else if (ev.event === 'final_verdict') {
      isCompleted = true;
      currentPhase = 'PHASE_5_FINAL_OUTPUT';
    } else if (ev.event === 'session_error') {
      isFailed = true;
    }
  }

  const phaseIndex = PHASES.findIndex((p) => p.id === currentPhase);
  const validIndex = phaseIndex >= 0 ? phaseIndex : 0;

  return {
    currentPhase,
    phaseIndex: validIndex,
    phaseLabel: PHASES[validIndex]?.label || 'Framing',
    roundNumber,
    maxRounds,
    isCompleted,
    isFailed,
    convergenceScore,
    phaseDurations,
  };
}

// ── RT4 §5: selectInteractionGraph Network & Matrix Reducer ──
export interface InteractionNode {
  id: PersonaId;
  name: string;
  colorHex: string;
  totalSpoken: number;
  challengesInitiated: number;
  challengesReceived: number;
  agreementsInitiated: number;
  agreementsReceived: number;
}

export interface InteractionLink {
  sourceId: PersonaId;
  targetId: PersonaId;
  count: number;
  agreeCount: number;
  challengeCount: number;
  concedeCount: number;
  primaryStance: 'AGREE' | 'CHALLENGE' | 'CONCEDE';
}

export interface InteractionMatrixCell {
  sourceId: PersonaId;
  targetId: PersonaId;
  count: number;
  agreeCount: number;
  challengeCount: number;
  concedeCount: number;
}

export interface InteractionGraph {
  nodes: InteractionNode[];
  links: InteractionLink[];
  matrix: Record<PersonaId, Record<PersonaId, InteractionMatrixCell>>;
  totalInteractions: number;
}

export function selectInteractionGraph(events: CouncilSSEEvent[] = []): InteractionGraph {
  const nodesMap: Map<PersonaId, InteractionNode> = new Map();

  for (const p of ALL_PERSONAS) {
    nodesMap.set(p.id, {
      id: p.id,
      name: p.name,
      colorHex: p.colorHex,
      totalSpoken: 0,
      challengesInitiated: 0,
      challengesReceived: 0,
      agreementsInitiated: 0,
      agreementsReceived: 0,
    });
  }

  const linksMap: Map<string, InteractionLink> = new Map();
  const matrix: Partial<Record<PersonaId, Record<PersonaId, InteractionMatrixCell>>> = {};

  for (const p1 of ALL_PERSONAS) {
    matrix[p1.id] = {} as Record<PersonaId, InteractionMatrixCell>;
    for (const p2 of ALL_PERSONAS) {
      matrix[p1.id]![p2.id] = {
        sourceId: p1.id,
        targetId: p2.id,
        count: 0,
        agreeCount: 0,
        challengeCount: 0,
        concedeCount: 0,
      };
    }
  }

  let totalInteractions = 0;

  for (const ev of events) {
    if (ev.event === 'persona_message') {
      const p = ev.payload as any;
      const speakerId = (p.speakerId || p.personaId) as PersonaId;
      const targetId = p.targetPersonaId as PersonaId;

      if (speakerId && nodesMap.has(speakerId)) {
        nodesMap.get(speakerId)!.totalSpoken++;
      }

      if (speakerId && targetId && speakerId !== targetId && nodesMap.has(speakerId) && nodesMap.has(targetId)) {
        totalInteractions++;
        const sNode = nodesMap.get(speakerId)!;
        const tNode = nodesMap.get(targetId)!;

        const cell = matrix[speakerId]![targetId];
        cell.count++;

        const linkKey = `${speakerId}->${targetId}`;
        if (!linksMap.has(linkKey)) {
          linksMap.set(linkKey, {
            sourceId: speakerId,
            targetId: targetId,
            count: 0,
            agreeCount: 0,
            challengeCount: 0,
            concedeCount: 0,
            primaryStance: 'AGREE',
          });
        }
        const link = linksMap.get(linkKey)!;
        link.count++;

        if (p.action === 'CHALLENGE') {
          sNode.challengesInitiated++;
          tNode.challengesReceived++;
          cell.challengeCount++;
          link.challengeCount++;
        } else if (p.action === 'AGREE') {
          sNode.agreementsInitiated++;
          tNode.agreementsReceived++;
          cell.agreeCount++;
          link.agreeCount++;
        } else if (p.action === 'CONCEDE') {
          cell.concedeCount++;
          link.concedeCount++;
        }

        link.primaryStance =
          link.challengeCount > link.agreeCount ? 'CHALLENGE' : link.agreeCount > 0 ? 'AGREE' : 'CONCEDE';
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    links: Array.from(linksMap.values()),
    matrix: matrix as Record<PersonaId, Record<PersonaId, InteractionMatrixCell>>,
    totalInteractions,
  };
}



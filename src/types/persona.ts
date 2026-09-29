/**
 * The Council - Persona Types & System Definitions
 * 
 * Strict TypeScript models for the 8 Council voting members and 1 non-voting moderator.
 */

export type PersonaId =
  | 'moderator'
  | 'skeptic'
  | 'optimist'
  | 'ethicist'
  | 'pragmatist'
  | 'systems_thinker'
  | 'historian'
  | 'humanist'
  | 'contrarian';

export type VotingPersonaId = Exclude<PersonaId, 'moderator'>;

export type CouncilMemberId = VotingPersonaId;

export type PersonaStatus = 'active' | 'unavailable';

export interface PersonaProfile {
  id: PersonaId;
  name: string;
  seatNumber: number; // 0 for moderator, 1-8 for council voting seats
  title: string;
  archetype: string;
  avatarGlyph: string; // Icon identifier, e.g. "Crown", "Compass", "Sparkles", "Scale", "Hammer", "Network", "Hourglass", "Heart", "Flame"
  avatarUrl: string;   // Image or visual path identifier
  colorHex: string;    // Brand accent color
  coreValues: string[];
  reasoningStyle: string;
  blindSpots: string;
  speakingStyle: string;
  systemPrompt: string;
}

export type PersonaConfig = PersonaProfile;

export const PERSONA_IDS: readonly PersonaId[] = [
  'moderator',
  'skeptic',
  'optimist',
  'ethicist',
  'pragmatist',
  'systems_thinker',
  'historian',
  'humanist',
  'contrarian',
] as const;

export const VOTING_PERSONA_IDS: readonly VotingPersonaId[] = [
  'skeptic',
  'optimist',
  'ethicist',
  'pragmatist',
  'systems_thinker',
  'historian',
  'humanist',
  'contrarian',
] as const;

export function isPersonaId(id: string): id is PersonaId {
  return PERSONA_IDS.includes(id as PersonaId);
}

export function isVotingPersonaId(id: string): id is VotingPersonaId {
  return VOTING_PERSONA_IDS.includes(id as VotingPersonaId);
}

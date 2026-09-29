/**
 * The Council - Persona Registry & Query Helpers
 * 
 * Provides typed access to the 8 voting council personas and 1 non-voting moderator.
 */

import {
  PersonaId,
  VotingPersonaId,
  PersonaProfile,
  isPersonaId,
  isVotingPersonaId,
} from '@/types/persona';

import moderatorJson from '@/config/personas/moderator.json';
import skepticJson from '@/config/personas/skeptic.json';
import optimistJson from '@/config/personas/optimist.json';
import ethicistJson from '@/config/personas/ethicist.json';
import pragmatistJson from '@/config/personas/pragmatist.json';
import systemsThinkerJson from '@/config/personas/systems_thinker.json';
import historianJson from '@/config/personas/historian.json';
import humanistJson from '@/config/personas/humanist.json';
import contrarianJson from '@/config/personas/contrarian.json';

// Strongly typed persona profiles
export const MODERATOR: PersonaProfile = moderatorJson as PersonaProfile;
export const SKEPTIC: PersonaProfile = skepticJson as PersonaProfile;
export const OPTIMIST: PersonaProfile = optimistJson as PersonaProfile;
export const ETHICIST: PersonaProfile = ethicistJson as PersonaProfile;
export const PRAGMATIST: PersonaProfile = pragmatistJson as PersonaProfile;
export const SYSTEMS_THINKER: PersonaProfile = systemsThinkerJson as PersonaProfile;
export const HISTORIAN: PersonaProfile = historianJson as PersonaProfile;
export const HUMANIST: PersonaProfile = humanistJson as PersonaProfile;
export const CONTRARIAN: PersonaProfile = contrarianJson as PersonaProfile;

/**
 * The 8 voting members of The Council, ordered by seat number (1-8).
 */
export const COUNCIL_MEMBERS: readonly PersonaProfile[] = [
  SKEPTIC,
  OPTIMIST,
  ETHICIST,
  PRAGMATIST,
  SYSTEMS_THINKER,
  HISTORIAN,
  HUMANIST,
  CONTRARIAN,
] as const;

/**
 * All 9 personas of The Council including the Moderator (Seat 0), ordered by seat number (0-8).
 */
export const ALL_PERSONAS: readonly PersonaProfile[] = [
  MODERATOR,
  SKEPTIC,
  OPTIMIST,
  ETHICIST,
  PRAGMATIST,
  SYSTEMS_THINKER,
  HISTORIAN,
  HUMANIST,
  CONTRARIAN,
] as const;

/**
 * Dictionary mapping PersonaId to PersonaProfile for O(1) lookups.
 */
export const PERSONA_MAP: Readonly<Record<PersonaId, PersonaProfile>> = {
  moderator: MODERATOR,
  skeptic: SKEPTIC,
  optimist: OPTIMIST,
  ethicist: ETHICIST,
  pragmatist: PRAGMATIST,
  systems_thinker: SYSTEMS_THINKER,
  historian: HISTORIAN,
  humanist: HUMANIST,
  contrarian: CONTRARIAN,
};

/**
 * Retrieves a persona profile by its unique ID.
 * Throws an Error if the provided ID is invalid.
 */
export function getPersonaById(id: PersonaId): PersonaProfile {
  const profile = PERSONA_MAP[id];
  if (!profile) {
    throw new Error(`Unknown persona ID: '${id}'. Expected one of: ${Object.keys(PERSONA_MAP).join(', ')}`);
  }
  return profile;
}

/**
 * Returns all 9 council personas (Moderator + 8 voting members) in an array.
 */
export function getAllPersonas(): PersonaProfile[] {
  return [...ALL_PERSONAS];
}

/**
 * Returns the 8 voting council members in an array.
 */
export function getCouncilMembers(): PersonaProfile[] {
  return [...COUNCIL_MEMBERS];
}

/**
 * Returns the non-voting Moderator profile.
 */
export function getModerator(): PersonaProfile {
  return MODERATOR;
}

/**
 * Helper to check whether a given persona is a voting council member.
 */
export function isVotingMember(id: string): id is VotingPersonaId {
  return isVotingPersonaId(id);
}

/**
 * Re-export all types for consumer convenience.
 */
export * from '@/types/persona';

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
 * Canonical alias map: normalizes LLM-returned camelCase / variant spellings
 * to the correct snake_case PersonaId used throughout the system.
 * The LLM occasionally emits "systemsThinker", "systems thinker", etc.
 */
const PERSONA_ALIAS_MAP: Readonly<Record<string, PersonaId>> = {
  // canonical pass-through
  moderator: 'moderator',
  skeptic: 'skeptic',
  optimist: 'optimist',
  ethicist: 'ethicist',
  pragmatist: 'pragmatist',
  systems_thinker: 'systems_thinker',
  historian: 'historian',
  humanist: 'humanist',
  contrarian: 'contrarian',
  // camelCase variants the LLM may emit
  systemsthinker: 'systems_thinker',
  systemsThinker: 'systems_thinker',
  systems_Thinker: 'systems_thinker',
  'systems thinker': 'systems_thinker',
  the_systems_thinker: 'systems_thinker',
  theskeptic: 'skeptic',
  theSkeptic: 'skeptic',
  theoptimist: 'optimist',
  theOptimist: 'optimist',
  theethicist: 'ethicist',
  theEthicist: 'ethicist',
  thepragmatist: 'pragmatist',
  thePragmatist: 'pragmatist',
  thehistorian: 'historian',
  theHistorian: 'historian',
  thehumanist: 'humanist',
  theHumanist: 'humanist',
  thecontrarian: 'contrarian',
  theContrarian: 'contrarian',
};

/**
 * Normalizes an LLM-returned persona ID string to the canonical PersonaId.
 * Returns null if the ID cannot be resolved.
 */
export function normalizePersonaId(raw: string): PersonaId | null {
  if (!raw) return null;
  // 1. Direct lookup (handles canonical + registered aliases)
  const direct = PERSONA_ALIAS_MAP[raw];
  if (direct) return direct;
  // 2. Case-insensitive + strip leading "the" prefix
  const lower = raw.toLowerCase().replace(/^the[-_\s]?/, '').replace(/[-\s]/g, '_');
  const indirect = PERSONA_ALIAS_MAP[lower] ?? (PERSONA_MAP[lower as PersonaId] ? lower as PersonaId : null);
  if (indirect) return indirect;
  // 3. Slug: convert camelCase → snake_case then look up
  const slug = raw
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/^the[-_\s]?/, '')
    .replace(/[-\s]+/g, '_');
  return PERSONA_MAP[slug as PersonaId] ? (slug as PersonaId) : null;
}

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
 * Safe (non-throwing) variant of getPersonaById.
 * Returns null for unknown or malformed IDs instead of throwing.
 */
export function findPersonaById(id: string | null | undefined): PersonaProfile | null {
  if (!id) return null;
  // Try direct lookup first
  const direct = PERSONA_MAP[id as PersonaId];
  if (direct) return direct;
  // Try normalization
  const normalized = normalizePersonaId(id);
  return normalized ? (PERSONA_MAP[normalized] ?? null) : null;
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

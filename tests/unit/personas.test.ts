import { describe, it, expect } from 'vitest';
import {
  ALL_PERSONAS,
  COUNCIL_MEMBERS,
  MODERATOR,
  PERSONA_MAP,
  getPersonaById,
  getAllPersonas,
  getCouncilMembers,
  getModerator,
  isVotingMember,
  PersonaId,
} from '@/lib/council/personas';

describe('Council Personas Configuration', () => {
  it('should export exactly 9 personas in ALL_PERSONAS and 8 in COUNCIL_MEMBERS', () => {
    expect(ALL_PERSONAS).toHaveLength(9);
    expect(COUNCIL_MEMBERS).toHaveLength(8);
    expect(getAllPersonas()).toHaveLength(9);
    expect(getCouncilMembers()).toHaveLength(8);
  });

  it('should have the Moderator at seat 0 with non-voting status', () => {
    const mod = getModerator();
    expect(mod.id).toBe('moderator');
    expect(mod.seatNumber).toBe(0);
    expect(mod.title).toBe('Council Arbiter & Deliberation Scribe');
    expect(mod.avatarGlyph).toBe('Crown');
    expect(mod.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(mod.systemPrompt).toContain('STRICT IMPARTIALITY');
    expect(mod.systemPrompt).toContain('<deliberation_subject>');
    expect(isVotingMember('moderator')).toBe(false);
  });

  it('should have 8 voting members ordered in seats 1 through 8', () => {
    const expectedSeats: { id: PersonaId; seat: number; glyph: string }[] = [
      { id: 'skeptic', seat: 1, glyph: 'Compass' },
      { id: 'optimist', seat: 2, glyph: 'Sparkles' },
      { id: 'ethicist', seat: 3, glyph: 'Scale' },
      { id: 'pragmatist', seat: 4, glyph: 'Hammer' },
      { id: 'systems_thinker', seat: 5, glyph: 'Network' },
      { id: 'historian', seat: 6, glyph: 'Hourglass' },
      { id: 'humanist', seat: 7, glyph: 'Heart' },
      { id: 'contrarian', seat: 8, glyph: 'Flame' },
    ];

    expectedSeats.forEach(({ id, seat, glyph }) => {
      const persona = getPersonaById(id);
      expect(persona).toBeDefined();
      expect(persona.id).toBe(id);
      expect(persona.seatNumber).toBe(seat);
      expect(persona.avatarGlyph).toBe(glyph);
      expect(persona.colorHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(persona.coreValues.length).toBeGreaterThanOrEqual(4);
      expect(persona.reasoningStyle.length).toBeGreaterThan(20);
      expect(persona.blindSpots.length).toBeGreaterThan(20);
      expect(persona.speakingStyle.length).toBeGreaterThan(20);
      expect(persona.systemPrompt.length).toBeGreaterThan(200);
      expect(isVotingMember(id)).toBe(true);
    });
  });

  it('should include prompt injection defense and anti-sycophancy in every system prompt', () => {
    ALL_PERSONAS.forEach((persona) => {
      // Must include security instructions regarding <deliberation_subject>
      expect(persona.systemPrompt).toContain('<deliberation_subject>');
      expect(persona.systemPrompt).toContain('PROMPT INJECTION');

      // Must include strict JSON output instructions
      expect(persona.systemPrompt).toContain('JSON');

      // Council voting personas must have anti-sycophancy mandate
      if (persona.seatNumber > 0) {
        expect(persona.systemPrompt).toContain('ANTI-SYCOPHANCY');
      }
    });
  });

  it('should enforce good-faith persuadability specifically for The Contrarian', () => {
    const contrarian = getPersonaById('contrarian');
    expect(contrarian.systemPrompt).toContain('GOOD FAITH');
    expect(contrarian.systemPrompt).toContain('persuadable');
    expect(contrarian.coreValues).toContain('Constructive Persuadability');
  });

  it('should throw an error when looking up an invalid persona ID', () => {
    // @ts-expect-error Testing invalid id runtime guard
    expect(() => getPersonaById('invalid_id')).toThrow(/Unknown persona ID/);
  });
});

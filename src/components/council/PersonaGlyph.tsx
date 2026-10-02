/**
 * Origin: The Council — Persona Vector Glyph Component
 * Canonical SVG vector icon renderer for Council personas and Moderator.
 * Ensures consistent Lucide vector icons appear in RoundTable, Map, List,
 * Shifts (TrajectoryChart), VerdictPanel (Strict Honesty Rule Dissent), and Home page.
 */

"use client";

import React from "react";
import {
  Crown,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
  User,
} from "lucide-react";
import { PersonaId, PersonaProfile } from "@/types/persona";
import { findPersonaById, ALL_PERSONAS } from "@/lib/council/personas";
import { cn } from "@/lib/utils";

export const GLYPH_MAP: Record<string, React.ElementType> = {
  Crown,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
};

export const PERSONA_GLYPH_ID_MAP: Record<PersonaId | string, React.ElementType> = {
  moderator: Crown,
  the_moderator: Crown,
  skeptic: Compass,
  the_skeptic: Compass,
  optimist: Sparkles,
  the_optimist: Sparkles,
  ethicist: Scale,
  the_ethicist: Scale,
  pragmatist: Hammer,
  the_pragmatist: Hammer,
  systems_thinker: Network,
  the_systems_thinker: Network,
  historian: Hourglass,
  the_historian: Hourglass,
  humanist: Heart,
  the_humanist: Heart,
  contrarian: Flame,
  the_contrarian: Flame,
};

export interface PersonaGlyphProps {
  personaId?: PersonaId | string | null;
  persona?: PersonaProfile | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const PersonaGlyph: React.FC<PersonaGlyphProps> = ({
  personaId,
  persona,
  size = 16,
  strokeWidth = 2,
  className = "",
  style,
}) => {
  // Resolve persona if only ID is provided
  const resolved = persona || (personaId ? findPersonaById(personaId as PersonaId) : null);
  const glyphName = resolved?.avatarGlyph;
  const id = resolved?.id || personaId;

  // Resolve Icon Component
  let IconComponent = glyphName ? GLYPH_MAP[glyphName] : null;
  if (!IconComponent && id) {
    IconComponent = PERSONA_GLYPH_ID_MAP[id];
  }
  if (!IconComponent) {
    IconComponent = User;
  }

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={cn("flex-shrink-0", className)}
      style={style}
      aria-hidden="true"
    />
  );
};

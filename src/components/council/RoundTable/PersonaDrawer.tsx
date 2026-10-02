/**
 * Origin: The Council Round Table v3 (Section 6)
 * Persona Detail Drawer (Radix dialog / bottom sheet on mobile) displaying
 * archetype, core values, blind spots, message history, and confidence sparkline.
 */

"use client";

import React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import {
  X,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
  Crown,
  Shield,
  EyeOff,
} from "lucide-react";
import { PersonaGlyph } from "@/components/council/PersonaGlyph";
import { PersonaProfile } from "@/types/persona";
import { OpeningPosition, RatificationVote } from "@/types/session";
import { cn } from "@/lib/utils";

export interface PersonaDrawerProps {
  persona: PersonaProfile | null;
  isOpen: boolean;
  onClose: () => void;
  confidence: number | null;
  confidenceDelta?: number;
  trajectoryPoints?: Array<{ round: number; confidence: number }>;
  openingPosition?: OpeningPosition;
  vote?: RatificationVote | 'sign_off' | 'amendment' | 'dissent';
  statements?: Array<{
    phase: string;
    round?: number;
    text: string;
    stance?: string;
    confidence?: number;
  }>;
}

export const PersonaDrawer: React.FC<PersonaDrawerProps> = ({
  persona,
  isOpen,
  onClose,
  confidence,
  confidenceDelta,
  trajectoryPoints = [],
  openingPosition,
  vote,
  statements = [],
}) => {
  if (!persona) return null;

  const color = persona.colorHex || "#6366F1";

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <RadixDialog.Content
          className={cn(
            "fixed right-0 top-0 bottom-0 z-50 w-full max-w-md",
            "bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)]",
            "p-6 flex flex-col gap-6 overflow-y-auto animate-spring-slide-right outline-none"
          )}
        >
          {/* Header with Glyph, Name, Role */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--bg-tertiary)] flex-shrink-0"
                style={{ color }}
              >
                <PersonaGlyph persona={persona} size={24} />
              </div>
              <div className="flex flex-col">
                <RadixDialog.Title className="text-base font-bold text-[var(--text-primary)]">
                  {persona.name}
                </RadixDialog.Title>
                <span className="text-xs text-[var(--text-secondary)]">
                  {persona.archetype || persona.title}
                </span>
              </div>
            </div>
            <RadixDialog.Close asChild>
              <button
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </RadixDialog.Close>
          </div>

          {/* Current Confidence & Sparkline */}
          {confidence !== null && (
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Current Confidence
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                    {confidence}%
                  </span>
                  {confidenceDelta !== undefined && confidenceDelta !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold",
                        confidenceDelta > 0 ? "text-[var(--status-low)]" : "text-[var(--status-urgent)]"
                      )}
                    >
                      {confidenceDelta > 0 ? `+${confidenceDelta}%` : `${confidenceDelta}%`}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline */}
              {trajectoryPoints.length > 1 && (
                <div className="w-24 h-8 flex items-end gap-1">
                  {trajectoryPoints.map((pt, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-[var(--accent)] rounded-t transition-all"
                      style={{ height: `${Math.max(15, (pt.confidence / 100) * 32)}px` }}
                      title={`Round ${pt.round}: ${pt.confidence}%`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lens & Philosophical Foundation */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
              <Shield size={12} /> Core Values & Reasoning Style
            </span>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-tertiary)] p-3 rounded-xl">
              {(persona as any).perspectivePrompt ||
                [persona.coreValues?.join(" • "), persona.reasoningStyle].filter(Boolean).join(" — ") ||
                "Committed to rigorous dialectical inquiry."}
            </p>
          </div>

          {/* Blind Spots */}
          {persona.blindSpots && (() => {
            const spots: string[] = Array.isArray(persona.blindSpots)
              ? (persona.blindSpots as unknown as string[])
              : typeof persona.blindSpots === "string"
              ? persona.blindSpots.split("\n").map((s) => s.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
              : [];
            if (spots.length === 0) return null;
            return (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                  <EyeOff size={12} /> Acknowledged Blind Spots
                </span>
                <ul className="text-xs text-[var(--text-secondary)] flex flex-col gap-1.5 bg-[var(--bg-tertiary)] p-3 rounded-xl">
                  {spots.map((spot, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[var(--status-medium)] font-bold">•</span>
                      <span>{spot}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Opening Position Summary */}
          {openingPosition && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Opening Position
              </span>
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] leading-relaxed">
                <p className="font-medium text-[var(--text-primary)] mb-1">
                  &ldquo;{openingPosition.positionSummary || (openingPosition as any).stance}&rdquo;
                </p>
                <p>{openingPosition.detailedReasoning || (openingPosition as any).reasoning}</p>
              </div>
            </div>
          )}

          {/* Message History */}
          {statements.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Deliberation Contributions ({statements.length})
              </span>
              <div className="flex flex-col gap-2">
                {statements.map((stmt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] leading-relaxed"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1">
                      <span>{stmt.phase}</span>
                      {stmt.confidence && <span>{stmt.confidence}%</span>}
                    </div>
                    <p>{stmt.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

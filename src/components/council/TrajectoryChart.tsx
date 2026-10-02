/**
 * Origin: The Council — Trajectory Shifts Panel (Section 5.3)
 * Uses pure selectConfidenceTrajectories to guarantee accurate shifts (B6 fix).
 * Displays compact rows: glyph tile · name · sparkline · 85 → 90 (+5) · ratification badge.
 */

"use client";

import React, { useState } from "react";
import { COUNCIL_MEMBERS, PersonaProfile, findPersonaById } from "@/lib/council/personas";
import { DeliberationSession } from "@/types/session";
import { CouncilSSEEvent } from "@/types/events";
import { selectConfidenceTrajectories, PersonaTrajectory } from "@/lib/ui/selectors";
import { PersonaGlyph } from "@/components/council/PersonaGlyph";
import { Check, Edit3, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrajectoryChartProps {
  session?: DeliberationSession | null;
  events?: CouncilSSEEvent[];
  onSelectPersona?: (persona: PersonaProfile) => void;
  className?: string;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  session,
  events,
  onSelectPersona,
  className = "",
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive trajectories via pure selector
  const trajectories = selectConfidenceTrajectories(session || events || null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={cn("flex flex-col gap-3 select-text", className)}>
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          How Personas&apos; Views Shifted
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          Dialectical Movement Across Rounds
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {COUNCIL_MEMBERS.map((member) => {
          const t: PersonaTrajectory = trajectories[member.id] || {
            personaId: member.id,
            initialConfidence: 50,
            finalConfidence: 50,
            delta: 0,
            points: [],
            formattedShift: "50 → 50 (0)",
          };

          const isExpanded = expandedId === member.id;
          const delta = t.delta;
          const vote = t.ratificationVote;

          return (
            <div
              key={member.id}
              className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-2.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Persona Identity */}
                <div
                  onClick={() => onSelectPersona?.(member)}
                  className="flex items-center gap-2.5 cursor-pointer min-w-0"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${member.colorHex}20`,
                      color: member.colorHex,
                    }}
                  >
                    <PersonaGlyph persona={member} personaId={member.id} size={15} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {member.name}
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{member.title}</p>
                  </div>
                </div>

                {/* Right: Sparkline, Trajectory String & Ratification Badge */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Sparkline */}
                  {t.points.length > 1 && (
                    <div className="w-20 h-6 flex items-end gap-1">
                      {t.points.map((pt, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex-1 bg-[var(--accent)]/40 rounded-t"
                          style={{
                            height: `${Math.max(6, (pt.confidence / 100) * 24)}px`,
                          }}
                          title={`Round ${pt.round}: ${pt.confidence}%`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Formatted Shift: e.g. 85 → 90 (+5) */}
                  <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                    {t.initialConfidence} → {t.finalConfidence}{" "}
                    <span
                      className={cn(
                        "text-[11px]",
                        delta > 0
                          ? "text-[var(--status-low)]"
                          : delta < 0
                          ? "text-[var(--status-urgent)]"
                          : "text-[var(--text-muted)]"
                      )}
                    >
                      ({delta > 0 ? `+${delta}` : delta})
                    </span>
                  </span>

                  {/* Ratification Badge */}
                  {vote && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono",
                        vote === "sign_off" && "bg-[var(--status-low)]/10 text-[var(--status-low)]",
                        vote === "amendment" && "bg-[var(--status-medium)]/10 text-[var(--status-medium)]",
                        vote === "dissent" && "bg-[var(--status-urgent)]/10 text-[var(--status-urgent)]"
                      )}
                    >
                      {vote === "sign_off" && <Check size={10} />}
                      {vote === "amendment" && <Edit3 size={10} />}
                      {vote === "dissent" && <X size={10} />}
                      <span className="capitalize">{vote.replace(/_/g, " ")}</span>
                    </span>
                  )}

                  {/* Expand button */}
                  {(t.amendmentReason || t.dissentReason) && (
                    <button
                      onClick={() => toggleExpand(member.id)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      aria-label="Toggle shift reason"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (t.amendmentReason || t.dissentReason) && (
                <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {vote === "amendment" ? "Proposed Amendment: " : "Core Dissent Principle: "}
                  </span>
                  <span>{t.amendmentReason || t.dissentReason}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Origin: The Council Round Table v3 (Section 6)
 * Center medallion with convergence ring, threshold tick, live phase label,
 * and 8-segment ratification ring resolving into the final verdict seal.
 */

"use client";

import React from "react";
import { Check, Scale, Sparkles } from "lucide-react";
import { DeliberationPhase } from "@/types/session";
import { PHASES } from "@/lib/ui/selectors";
import { PersonaId } from "@/types/persona";
import { COUNCIL_MEMBERS } from "@/lib/council/personas";
import { cn } from "@/lib/utils";

export interface VerdictSealProps {
  phase: DeliberationPhase;
  roundNumber?: number;
  maxRounds?: number;
  convergenceScore?: number;
  isUnanimous?: boolean;
  status: "idle" | "running" | "completed" | "failed" | "aborted";
  ratificationVotes?: Record<string, 'sign_off' | 'amendment' | 'dissent'>;
  onViewVerdict?: () => void;
  size?: number;
}

export const VerdictSeal: React.FC<VerdictSealProps> = ({
  phase,
  roundNumber = 1,
  maxRounds = 3,
  convergenceScore = 0,
  isUnanimous = false,
  status,
  ratificationVotes = {},
  onViewVerdict,
  size = 144,
}) => {
  const isFinished = status === "completed" || phase === "PHASE_5_FINAL_OUTPUT";
  const currentPhaseDef = PHASES.find((p) => p.id === phase) || PHASES[0];

  const ringRadius = 46;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * ringRadius;
  const validScore = Math.min(100, Math.max(0, convergenceScore));
  const strokeDashoffset = circumference - (circumference * validScore) / 100;

  // 8 segments for the ratification ring (one per voting member)
  const segmentLength = (circumference / 8) - 4;

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className="relative flex items-center justify-center select-none"
    >
      <svg
        className="absolute inset-0 pointer-events-none -rotate-90 overflow-visible"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {!isFinished ? (
          <>
            {/* Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              className="stroke-[var(--bg-tertiary)]"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Fill */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              className="stroke-[var(--accent)] transition-all duration-700 ease-out"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
            {/* Threshold Tick at 85% */}
            <line
              x1={size / 2 + ringRadius - 4}
              y1={size / 2}
              x2={size / 2 + ringRadius + 4}
              y2={size / 2}
              className="stroke-[var(--text-muted)]"
              strokeWidth={1.5}
              transform={`rotate(${0.85 * 360}, ${size / 2}, ${size / 2})`}
            />
          </>
        ) : (
          /* Ratification 8-Segment Ring */
          <g>
            {COUNCIL_MEMBERS.map((member, i) => {
              const vote = ratificationVotes[member.id] || "sign_off";
              const angle = (i * 360) / 8;
              const isSignOff = vote === "sign_off";
              const isAmendment = vote === "amendment";

              return (
                <circle
                  key={member.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={ringRadius}
                  stroke={member.colorHex}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={-((i * circumference) / 8)}
                  strokeOpacity={isSignOff ? 1 : isAmendment ? 0.6 : 0.25}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}
      </svg>

      {/* Central Content */}
      <div
        onClick={onViewVerdict}
        className={cn(
          "relative z-10 flex flex-col items-center justify-center text-center p-2 rounded-full",
          "w-[110px] h-[110px] bg-[var(--bg-primary)]/80 backdrop-blur-sm",
          onViewVerdict && "cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
        )}
      >
        {!isFinished ? (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {currentPhaseDef.shortLabel}
            </span>
            {phase === "PHASE_2_CROSS_EXAM" && (
              <span className="font-mono text-xs font-medium text-[var(--text-primary)] mt-0.5">
                Round {roundNumber}/{maxRounds}
              </span>
            )}
            <span className="font-mono text-base font-bold text-[var(--text-primary)] mt-0.5">
              {convergenceScore}%
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center",
                isUnanimous ? "bg-[var(--status-low)]/15 text-[var(--status-low)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              )}
            >
              {isUnanimous ? <Check size={16} strokeWidth={2.5} /> : <Scale size={16} strokeWidth={2} />}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              {isUnanimous ? "Unanimous" : "Dissent"}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono">
              View Verdict
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

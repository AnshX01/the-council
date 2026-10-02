/**
 * Origin: The Council Round Table v3 (Section 6)
 * Center medallion with convergence ring, threshold tick, live phase label,
 * and high-contrast verdict seal resolving into a clean consensus ring.
 */

"use client";

import React from "react";
import { Check, Scale } from "lucide-react";
import { DeliberationPhase } from "@/types/session";
import { PHASES } from "@/lib/ui/selectors";
import { cn } from "@/lib/utils";

export interface VerdictSealProps {
  phase: DeliberationPhase;
  roundNumber?: number;
  maxRounds?: number;
  convergenceScore?: number;
  phaseProgress?: number;
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
  phaseProgress = 0,
  isUnanimous = false,
  status,
  ratificationVotes = {},
  onViewVerdict,
  size = 144,
}) => {
  const isFinished = status === "completed" || phase === "PHASE_5_FINAL_OUTPUT";
  const currentPhaseDef = PHASES.find((p) => p.id === phase) || PHASES[0];

  const ringRadius = 46;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * ringRadius;

  const displayProgress = phase === "PHASE_0_FRAMING"
    ? 100
    : phase === "PHASE_1_OPENING"
    ? (phaseProgress || 0)
    : phase === "PHASE_2_CROSS_EXAM"
    ? (convergenceScore || phaseProgress || 0)
    : phase === "PHASE_3_CONVERGENCE_CHECK"
    ? (convergenceScore || 85)
    : phase === "PHASE_4_RATIFICATION"
    ? (phaseProgress || convergenceScore || 0)
    : 100;

  const validScore = Math.min(100, Math.max(0, displayProgress));
  const strokeDashoffset = circumference - (circumference * validScore) / 100;

  const votesList = Object.values(ratificationVotes);
  const dissentsFromVotes = votesList.filter(
    (v) => v === "dissent" || (v as any)?.vote === "OBJECT"
  ).length;
  const ratifiedFromVotes = votesList.filter(
    (v) =>
      v === "sign_off" ||
      v === "amendment" ||
      (v as any)?.vote === "SIGN_OFF" ||
      (v as any)?.vote === "SIGN_OFF_WITH_AMENDMENT"
  ).length;

  const is5050Split = !isUnanimous && dissentsFromVotes === 4 && ratifiedFromVotes === 4;
  const isMajority = !isUnanimous && !is5050Split && ratifiedFromVotes >= 5;

  const verdictLabel = isUnanimous
    ? "Unanimous"
    : is5050Split
    ? "50-50 Split"
    : isMajority
    ? "Majority"
    : "Dissent";

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
              stroke="var(--bg-tertiary)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Fill */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              stroke="var(--accent)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-700 ease-out"
            />
            {/* Threshold Tick at 85% */}
            <line
              x1={size / 2 + ringRadius - 4}
              y1={size / 2}
              x2={size / 2 + ringRadius + 4}
              y2={size / 2}
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              transform={`rotate(${0.85 * 360}, ${size / 2}, ${size / 2})`}
            />
          </>
        ) : (
          /* Clean Unified Verdict Ring */
          <g>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              stroke={
                isUnanimous
                  ? "var(--status-low)"
                  : is5050Split
                  ? "var(--status-medium)"
                  : "var(--accent)"
              }
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.9}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius + 3}
              stroke={
                isUnanimous
                  ? "var(--status-low)"
                  : is5050Split
                  ? "var(--status-medium)"
                  : "var(--border-subtle)"
              }
              strokeWidth={1}
              fill="none"
              opacity={isUnanimous ? 0.35 : 0.2}
            />
          </g>
        )}
      </svg>

      {/* Central Content */}
      <div
        className={cn(
          "relative z-10 flex flex-col items-center justify-center text-center p-2 rounded-full",
          "w-[104px] h-[104px] bg-[var(--bg-primary)] border border-[var(--border-subtle)]"
        )}
      >
        {!isFinished ? (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {currentPhaseDef.shortLabel}
            </span>
            {phase === "PHASE_1_OPENING" && (
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
                Statements
              </span>
            )}
            {phase === "PHASE_2_CROSS_EXAM" && (
              <span className="font-mono text-xs font-medium text-[var(--text-primary)] mt-0.5">
                Round {roundNumber}/{maxRounds}
              </span>
            )}
            {phase === "PHASE_4_RATIFICATION" && (
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
                Voting
              </span>
            )}
            <span className="font-mono text-base font-bold text-[var(--text-primary)] mt-0.5">
              {displayProgress}%
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center mb-0.5",
                isUnanimous
                  ? "bg-[var(--status-low)]/15 text-[var(--status-low)]"
                  : is5050Split
                  ? "bg-[var(--status-medium)]/15 text-[var(--status-medium)]"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              )}
            >
              {isUnanimous ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Scale size={14} strokeWidth={2} />
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              {verdictLabel}
            </span>
            <button
              type="button"
              onClick={onViewVerdict}
              className="inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] border border-[var(--border-default)] text-[9px] font-mono font-medium text-[var(--text-primary)] transition-all cursor-pointer shadow-none"
            >
              <span>View Verdict</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

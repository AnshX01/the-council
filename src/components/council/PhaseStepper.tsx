/**
 * Origin: The Council — Phase Stepper (Section 5.3)
 * Slim 6-segment progress bar using canonical PHASES with spring fill.
 * Eliminates out-of-spec phase names (B9 fix) and violet/indigo utility classes.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { DeliberationPhase } from "@/types/session";
import { PHASES } from "@/lib/ui/selectors";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhaseStepperProps {
  currentPhase: DeliberationPhase;
  phaseDurations?: Partial<Record<DeliberationPhase, number>>;
  className?: string;
}

export const PhaseStepper: React.FC<PhaseStepperProps> = ({
  currentPhase,
  phaseDurations = {},
  className = "",
}) => {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const isAllComplete = currentPhase === "PHASE_5_FINAL_OUTPUT";

  return (
    <nav
      aria-label="Deliberation phase progress"
      className={cn(
        "w-full p-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] select-none",
        className
      )}
    >
      <div className="grid grid-cols-6 gap-2">
        {PHASES.map((p, i) => {
          const isCompleted = isAllComplete || activeIndex > i;
          const isCurrent = !isAllComplete && activeIndex === i;
          const durationSec = phaseDurations[p.id];

          return (
            <div key={p.id} className="flex flex-col gap-1.5">
              {/* Segment track with spring indicator */}
              <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden relative">
                {isCompleted && (
                  <div className="h-full w-full bg-[var(--accent)] rounded-full" />
                )}
                {isCurrent && (
                  <motion.div
                    layoutId="stepper-active-indicator"
                    className="h-full bg-[var(--accent)] rounded-full w-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>

              {/* Phase name & duration */}
              <div className="flex items-center justify-between text-[10px]">
                <span
                  className={cn(
                    "font-medium truncate",
                    isCurrent
                      ? "text-[var(--text-primary)] font-semibold"
                      : isCompleted
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]"
                  )}
                >
                  Phase {i}: {p.shortLabel}
                </span>

                {durationSec !== undefined && (
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">
                    {durationSec}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

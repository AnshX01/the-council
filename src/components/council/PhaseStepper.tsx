'use client';

import React from 'react';
import { CheckCircle2, CircleDot, Circle } from 'lucide-react';
import { DeliberationPhase } from '@/types/session';

export interface PhaseStepperProps {
  currentPhase: DeliberationPhase;
  className?: string;
}

const PHASES: Array<{ id: DeliberationPhase; index: number; label: string; short: string }> = [
  { id: 'PHASE_0_FRAMING', index: 0, label: 'Framing', short: 'P0' },
  { id: 'PHASE_1_OPENING', index: 1, label: 'Opening', short: 'P1' },
  { id: 'PHASE_2_CROSS_EXAM', index: 2, label: 'Debate', short: 'P2' },
  { id: 'PHASE_3_CONVERGENCE_CHECK', index: 3, label: 'Synthesis', short: 'P3' },
  { id: 'PHASE_4_RATIFICATION', index: 4, label: 'Voting', short: 'P4' },
  { id: 'PHASE_5_FINAL_OUTPUT', index: 5, label: 'Verdict', short: 'P5' },
];

export const PhaseStepper: React.FC<PhaseStepperProps> = ({ currentPhase, className = '' }) => {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <nav
      aria-label="Deliberation phase progress"
      className={`w-full glass-panel-subtle px-4 py-3 rounded-2xl ${className}`}
    >
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {PHASES.map((p, i) => {
          const isCompleted = currentIndex > i || currentPhase === 'PHASE_5_FINAL_OUTPUT';
          const isCurrent = currentIndex === i && currentPhase !== 'PHASE_5_FINAL_OUTPUT';

          return (
            <li
              key={p.id}
              className={`flex-1 flex items-center gap-1.5 sm:gap-2 ${
                i !== PHASES.length - 1 ? 'relative' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 ring-2 ring-indigo-500/20'
                      : 'bg-black/5 dark:bg-white/10 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    p.index
                  )}
                </span>

                <div className="flex flex-col">
                  <span
                    className={`text-xs font-semibold whitespace-nowrap leading-tight hidden sm:inline ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isCompleted
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400'
                    }`}
                  >
                    {p.label}
                  </span>
                  <span className="text-[9px] text-gray-400 uppercase font-mono">
                    Phase {p.index}
                  </span>
                </div>
              </div>

              {/* Connecting line */}
              {i !== PHASES.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full mx-1 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500/60'
                      : 'bg-black/5 dark:bg-white/10'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

'use client';

import React from 'react';
import { DeliberationPhase } from '@/types/session';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface PhaseTrackerProps {
  currentPhase: DeliberationPhase;
  currentRound?: number;
  maxRounds?: number;
  currentCycle?: number;
}

const PHASES: { id: DeliberationPhase; label: string; shortLabel: string; phaseNumber: string }[] = [
  { id: 'PHASE_0_FRAMING', label: 'Framing', shortLabel: '0', phaseNumber: 'Phase 0' },
  { id: 'PHASE_1_OPENING', label: 'Opening Positions', shortLabel: '1', phaseNumber: 'Phase 1' },
  { id: 'PHASE_2_CROSS_EXAM', label: 'Cross-Examination', shortLabel: '2', phaseNumber: 'Phase 2' },
  { id: 'PHASE_4_RATIFICATION', label: 'Ratification', shortLabel: '3', phaseNumber: 'Phase 3' },
  { id: 'PHASE_5_FINAL_OUTPUT', label: 'Final Verdict', shortLabel: '4', phaseNumber: 'Phase 4' },
];

export function PhaseTracker({
  currentPhase,
  currentRound = 1,
  maxRounds = 3,
  currentCycle = 1,
}: PhaseTrackerProps) {
  const getPhaseIndex = (phase: DeliberationPhase): number => {
    switch (phase) {
      case 'PHASE_0_FRAMING':
        return 0;
      case 'PHASE_1_OPENING':
        return 1;
      case 'PHASE_2_CROSS_EXAM':
      case 'PHASE_3_CONVERGENCE_CHECK':
        return 2;
      case 'PHASE_4_RATIFICATION':
        return 3;
      case 'PHASE_5_FINAL_OUTPUT':
        return 4;
      case 'FAILED':
        return -1;
      default:
        return 0;
    }
  };

  const activeIndex = getPhaseIndex(currentPhase);
  const isFailed = currentPhase === 'FAILED';

  return (
    <GlassCard
      as="nav"
      aria-label="Deliberation phase progress"
      padded="sm"
      className="w-full !rounded-[16px] overflow-hidden"
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto px-2 sm:px-4 py-1">
        {PHASES.map((p, idx) => {
          const isCompleted = !isFailed && activeIndex > idx;
          const isCurrent = !isFailed && activeIndex === idx;

          return (
            <React.Fragment key={p.id}>
              {idx > 0 && (
                <div
                  className={`flex-1 h-[2px] mx-2 sm:mx-3 rounded-full transition-all duration-500 ${
                    isCompleted
                      ? 'bg-indigo-600 dark:bg-indigo-500 shadow-xs'
                      : 'bg-gray-200/80 dark:bg-white/10'
                  }`}
                />
              )}

              <div className="flex flex-col items-center group">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                      : isCurrent
                      ? 'border-2 border-indigo-600 dark:border-indigo-400 bg-white/90 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-500/15'
                      : 'border border-gray-200/90 dark:border-white/15 bg-white/40 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className="font-mono text-[11px]">{idx + 1}</span>
                  )}
                </div>

                <div className="mt-1.5 text-center">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-gray-500 block leading-tight">
                    {p.phaseNumber}
                  </span>
                  <span
                    className={`text-[11px] sm:text-xs tracking-tight block ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                        : isCompleted
                        ? 'text-gray-900 dark:text-gray-200 font-medium'
                        : 'text-gray-400 dark:text-gray-500 font-normal'
                    }`}
                  >
                    {p.label}
                  </span>
                  {isCurrent && p.id === 'PHASE_2_CROSS_EXAM' && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium block">
                      Round {currentRound}/{maxRounds}
                    </span>
                  )}
                  {isCurrent && p.id === 'PHASE_4_RATIFICATION' && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium block">
                      Cycle {currentCycle}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {isFailed && (
        <div className="mt-2.5 pt-2 border-t border-red-500/20 flex items-center justify-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Deliberation encountered an execution failure</span>
        </div>
      )}
    </GlassCard>
  );
}

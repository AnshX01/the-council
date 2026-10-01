'use client';

import React from 'react';
import {
  CheckCircle2,
  Scale,
  Sparkles,
  Loader2,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import { DeliberationPhase } from '@/types/session';

export interface VerdictSealProps {
  phase: DeliberationPhase;
  convergenceScore: number;
  isUnanimous?: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'aborted';
  onViewVerdict?: () => void;
  size?: number;
}

export const VerdictSeal: React.FC<VerdictSealProps> = ({
  phase,
  convergenceScore,
  isUnanimous = false,
  status,
  onViewVerdict,
  size = 140,
}) => {
  const isFinished = status === 'completed';
  const isRunning = status === 'running';

  const ringRadius = (size / 2) - 8;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, convergenceScore))) / 100;

  const phaseLabels: Record<DeliberationPhase, string> = {
    PHASE_0_FRAMING: 'Phase 0: Framing',
    PHASE_1_OPENING: 'Phase 1: Opening',
    PHASE_2_CROSS_EXAM: 'Phase 2: Debate',
    PHASE_3_CONVERGENCE_CHECK: 'Phase 3: Synthesis',
    PHASE_4_RATIFICATION: 'Phase 4: Voting',
    PHASE_5_FINAL_OUTPUT: 'Phase 5: Verdict',
    FAILED: 'Failed',
  };

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className="relative flex items-center justify-center select-none"
    >
      {/* Outer SVG Convergence Ring */}
      <svg
        className="absolute inset-0 pointer-events-none -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          fill="none"
          stroke="currentColor"
          className="text-black/5 dark:text-white/10"
          strokeWidth={3}
        />
        {/* Active progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          fill="none"
          stroke={
            isFinished
              ? isUnanimous
                ? '#10B981' // Green
                : '#64748B' // Dignified Slate
              : '#6366F1'   // Indigo
          }
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center Table Medallion Card */}
      <div
        onClick={isFinished ? onViewVerdict : undefined}
        role={isFinished ? 'button' : undefined}
        tabIndex={isFinished ? 0 : undefined}
        onKeyDown={(e) => {
          if (isFinished && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onViewVerdict?.();
          }
        }}
        className={`w-[${size - 24}px] h-[${size - 24}px] rounded-full glass-panel-elevated flex flex-col items-center justify-center p-3 text-center transition-all duration-300 ${
          isFinished
            ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-lg ring-1 ring-white/20'
            : ''
        }`}
        style={{
          width: `${size - 24}px`,
          height: `${size - 24}px`,
          background: isFinished
            ? isUnanimous
              ? 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.02) 100%)'
              : 'radial-gradient(circle, rgba(100,116,139,0.15) 0%, rgba(100,116,139,0.02) 100%)'
            : undefined,
        }}
      >
        {isFinished ? (
          isUnanimous ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                <CheckCircle2 className="w-5 h-5 stroke-[2.4]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-tight">
                Unanimous
              </span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                Verdict Sealed
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-slate-500/20 text-slate-600 dark:text-slate-400 flex items-center justify-center mb-1">
                <Scale className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 leading-tight">
                Consensus
              </span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                Dissent Recorded
              </span>
            </div>
          )
        ) : isRunning ? (
          <div className="flex flex-col items-center">
            <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              {Math.round(convergenceScore)}%
            </span>
            <span className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
              Convergence
            </span>
            <span className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">
              {phaseLabels[phase]?.split(':')[0] || 'Active'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Sparkles className="w-5 h-5 text-indigo-500 mb-1" />
            <span className="text-[10px] font-semibold text-gray-800 dark:text-gray-200">
              The Council
            </span>
            <span className="text-[8px] text-gray-400 tracking-wider">
              Ready
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

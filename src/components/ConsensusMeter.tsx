'use client';

import React from 'react';
import { ConvergenceDraft } from '@/types/session';

interface ConsensusMeterProps {
  score: number; // 0 to 100
  history?: ConvergenceDraft[];
  statusLabel?: string;
}

export function ConsensusMeter({
  score,
  history = [],
  statusLabel,
}: ConsensusMeterProps) {
  // Determine qualitative tier
  const getTier = (s: number) => {
    if (s >= 90) return { label: 'High Alignment / Consensus Ready', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' };
    if (s >= 70) return { label: 'Emerging Consensus', color: 'text-indigo-600 dark:text-indigo-400', bar: 'bg-indigo-500' };
    if (s >= 50) return { label: 'Active Dialectical Debate', color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' };
    return { label: 'High Philosophical Divergence', color: 'text-red-500 dark:text-red-400', bar: 'bg-red-500' };
  };

  const tier = getTier(score);

  return (
    <div className="w-full rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/40 p-4 backdrop-blur-sm shadow-sm transition-smooth">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Consensus Alignment Meter
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 ${tier.color}`}>
            {statusLabel || tier.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono tracking-tight text-gray-900 dark:text-gray-100">
            {Math.round(score)}%
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">convergence</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
        <div
          className={`h-full rounded-full ${tier.bar} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      {/* Historical convergence spark indicators across rounds */}
      {history.length > 1 && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono">
          <span className="text-[10px] uppercase font-sans tracking-wider">Round Trajectory:</span>
          <div className="flex items-center gap-3">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-gray-400">R{h.roundNumber}:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {Math.round(h.alignmentScore)}%
                </span>
                {i < history.length - 1 && <span className="text-gray-300 dark:text-gray-700">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

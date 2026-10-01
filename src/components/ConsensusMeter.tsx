'use client';

import React from 'react';
import { ConvergenceDraft } from '@/types/session';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, Activity } from 'lucide-react';

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
    if (s >= 90) return { label: 'High Alignment / Consensus Ready', variant: 'success' as const, barClass: 'bg-emerald-500 shadow-sm shadow-emerald-500/50' };
    if (s >= 70) return { label: 'Emerging Consensus', variant: 'accent' as const, barClass: 'bg-indigo-500 shadow-sm shadow-indigo-500/50' };
    if (s >= 50) return { label: 'Active Dialectical Debate', variant: 'warning' as const, barClass: 'bg-amber-500 shadow-sm shadow-amber-500/50' };
    return { label: 'Philosophical Divergence', variant: 'danger' as const, barClass: 'bg-red-500 shadow-sm shadow-red-500/50' };
  };

  const tier = getTier(score);

  return (
    <GlassCard padded="md" className="w-full !rounded-[16px] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Consensus Alignment Meter
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono tracking-tight text-gray-950 dark:text-gray-50">
            {Math.round(score)}%
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">convergence</span>
        </div>
      </div>

      <div>
        <Badge variant={tier.variant} size="xs" dot className="mb-2">
          {statusLabel || tier.label}
        </Badge>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-gray-200/80 dark:bg-white/10 overflow-hidden relative p-0.5">
          <div
            className={`h-full rounded-full ${tier.barClass} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      </div>

      {/* Historical convergence spark indicators across rounds */}
      {history.length > 1 && (
        <div className="pt-2.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono">
          <span className="text-[10px] uppercase font-sans tracking-wider text-gray-400">Trajectory:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-gray-400">R{h.roundNumber}:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {Math.round(h.alignmentScore)}%
                </span>
                {i < history.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 dark:text-gray-600 inline" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

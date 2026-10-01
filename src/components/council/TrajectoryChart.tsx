'use client';

import React from 'react';
import { COUNCIL_MEMBERS, PersonaProfile } from '@/lib/council/personas';
import { OpeningPosition, CrossExamRound, RatificationVote } from '@/types/session';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface TrajectoryChartProps {
  openingPositions?: Partial<Record<string, OpeningPosition>>;
  crossExamRounds?: CrossExamRound[];
  ratificationVotes?: Partial<Record<string, RatificationVote>>;
  onSelectPersona?: (persona: PersonaProfile) => void;
  className?: string;
}

export const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  openingPositions = {},
  crossExamRounds = [],
  ratificationVotes = {},
  onSelectPersona,
  className = '',
}) => {
  return (
    <div className={`w-full glass-panel-subtle p-4 sm:p-5 rounded-2xl space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
            How Views Shifted (Trajectory Analysis)
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Tracking epistemic movement from opening thesis through dialectical cross-examination
          </p>
        </div>
        <Badge variant="neutral" size="xs">
          8 Member Shifts
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COUNCIL_MEMBERS.map((member) => {
          const opening = openingPositions[member.id];
          const openingConf = opening?.confidenceScore ?? 50;

          // Track confidence over rounds
          const confPoints: number[] = [openingConf];
          let lastShiftReason: string | null = null;
          let catalysts: string[] = [];

          crossExamRounds.forEach((round) => {
            const turn = round.turns[member.id];
            if (turn) {
              confPoints.push(turn.updatedConfidence);
              if (turn.shiftRecord) {
                lastShiftReason = turn.shiftRecord.shiftRationale;
                catalysts = turn.shiftRecord.catalystPersonaIds;
              }
            }
          });

          const currentConf = confPoints[confPoints.length - 1];
          const delta = currentConf - openingConf;
          const vote = ratificationVotes[member.id];

          // Sparkline coordinates (width 80, height 24)
          const sparkWidth = 72;
          const sparkHeight = 22;
          const sparkPoints = confPoints
            .map((val, idx) => {
              const x = confPoints.length === 1 ? sparkWidth / 2 : (idx / (confPoints.length - 1)) * sparkWidth;
              const y = sparkHeight - (val / 100) * sparkHeight;
              return `${Math.round(x)},${Math.round(y)}`;
            })
            .join(' ');

          return (
            <div
              key={member.id}
              onClick={() => onSelectPersona?.(member)}
              role="button"
              tabIndex={0}
              className="p-3 rounded-xl border border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/2 hover:border-black/10 dark:hover:border-white/15 transition-all text-xs space-y-2 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: member.colorHex }}>
                  {member.name}
                </span>

                {/* Delta Badge */}
                <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                  {delta > 0 ? (
                    <span className="text-emerald-500 inline-flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" />+{delta}%
                    </span>
                  ) : delta < 0 ? (
                    <span className="text-rose-500 inline-flex items-center">
                      <TrendingDown className="w-3 h-3 mr-0.5" />{delta}%
                    </span>
                  ) : (
                    <span className="text-gray-400 inline-flex items-center">
                      <Minus className="w-3 h-3 mr-0.5" />0%
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline & Current Confidence */}
              <div className="flex items-center justify-between pt-1">
                <div className="w-[72px] h-[22px]">
                  <svg width={sparkWidth} height={sparkHeight} className="overflow-visible">
                    <polyline
                      fill="none"
                      stroke={member.colorHex}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparkPoints}
                    />
                  </svg>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">
                    Confidence
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {currentConf}%
                  </span>
                </div>
              </div>

              {/* Vote result badge */}
              {vote && (
                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Ratification:</span>
                  {vote.vote === 'SIGN_OFF' ? (
                    <Badge variant="success" size="xs" icon={<CheckCircle2 className="w-3 h-3" />}>
                      Sign-Off
                    </Badge>
                  ) : vote.vote === 'SIGN_OFF_WITH_AMENDMENT' ? (
                    <Badge variant="warning" size="xs" icon={<AlertTriangle className="w-3 h-3" />}>
                      Amendment
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="xs" icon={<XCircle className="w-3 h-3" />}>
                      Dissent
                    </Badge>
                  )}
                </div>
              )}

              {/* Catalyst note */}
              {lastShiftReason && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic pt-1">
                  Shifted: &ldquo;{lastShiftReason}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

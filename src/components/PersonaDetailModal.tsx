'use client';

import React from 'react';
import { PersonaProfile } from '@/types/persona';
import {
  OpeningPosition,
  CrossExamRound,
  RatificationVote,
  ShiftRecord,
} from '@/types/session';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface PersonaDetailModalProps {
  persona: PersonaProfile | null;
  openingPosition?: OpeningPosition;
  crossExamRounds?: CrossExamRound[];
  shiftHistory?: ShiftRecord[];
  ratificationVote?: RatificationVote;
  onClose: () => void;
}

export function PersonaDetailModal({
  persona,
  openingPosition,
  crossExamRounds = [],
  shiftHistory = [],
  ratificationVote,
  onClose,
}: PersonaDetailModalProps) {
  if (!persona) return null;

  const personaShifts = shiftHistory.filter((s) => s.personaId === persona.id);

  return (
    <Modal
      isOpen={Boolean(persona)}
      onClose={onClose}
      showTrafficLights
      maxWidth="xl"
      ariaLabelledBy="persona-modal-title"
      title={
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-base shadow-sm shrink-0 border"
            style={{
              backgroundColor: `${persona.colorHex}22`,
              color: persona.colorHex,
              borderColor: `${persona.colorHex}45`,
            }}
          >
            {persona.name.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span id="persona-modal-title" className="font-serif font-bold text-lg text-gray-950 dark:text-gray-50">
                {persona.name}
              </span>
              <Badge variant="accent" size="xs">
                Seat {persona.seatNumber}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-sans font-normal mt-0.5">
              {persona.title} &bull; {persona.archetype}
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Cognitive Directives */}
        <div className="p-4 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/10 space-y-3">
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 block mb-1.5 uppercase text-[11px] tracking-wider">
              Core Values
            </span>
            <div className="flex flex-wrap gap-1.5">
              {persona.coreValues.map((v, i) => (
                <Badge
                  key={i}
                  variant="neutral"
                  size="sm"
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-gray-100 dark:border-white/5">
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 block mb-1 uppercase text-[11px] tracking-wider">
                Reasoning Style
              </span>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                {persona.reasoningStyle}
              </p>
            </div>

            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 block mb-1 uppercase text-[11px] tracking-wider">
                Blind Spots
              </span>
              <p className="text-amber-700/90 dark:text-amber-300/80 leading-relaxed text-[11px]">
                {persona.blindSpots}
              </p>
            </div>
          </div>
        </div>

        {/* Initial Stance */}
        {openingPosition && (
          <div className="p-4 rounded-[14px] bg-white/60 dark:bg-white/[0.04] border border-gray-200/70 dark:border-white/10 space-y-2 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase text-[11px] tracking-wider text-gray-500 dark:text-gray-400">
                Initial Opening Stance (Phase 1)
              </span>
              <Badge variant="accent" size="xs">
                {openingPosition.confidenceScore}% confidence
              </Badge>
            </div>
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 italic leading-relaxed">
              &ldquo;{openingPosition.positionSummary}&rdquo;
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {openingPosition.detailedReasoning}
            </p>
            <div className="p-2.5 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/10 text-xs">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Falsification Condition:
              </span>{' '}
              <span className="text-gray-600 dark:text-gray-400">
                {openingPosition.falsificationCondition}
              </span>
            </div>
          </div>
        )}

        {/* Position Movement Across Rounds */}
        <div className="space-y-2.5">
          <span className="font-semibold uppercase text-[11px] tracking-wider text-gray-500 dark:text-gray-400 block">
            Trajectory & Position Movement
          </span>

          {personaShifts.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5">
              No position shifts recorded yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {personaShifts.map((shift, i) => {
                const isUp = shift.deltaConfidence > 0;
                return (
                  <div
                    key={i}
                    className="p-3 rounded-[12px] border border-gray-200/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        Round {shift.roundNumber} Shift
                      </span>
                      <span className="flex items-center gap-1 font-bold">
                        {shift.previousConfidence}% &rarr; {shift.newConfidence}%
                        {shift.deltaConfidence !== 0 && (
                          <span className={isUp ? 'text-emerald-500' : 'text-red-500'}>
                            ({isUp ? `+${shift.deltaConfidence}` : shift.deltaConfidence}%)
                          </span>
                        )}
                      </span>
                    </div>

                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      &ldquo;{shift.newPosition}&rdquo;
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                      Rationale: {shift.shiftRationale}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ratification Vote */}
        {ratificationVote && (
          <div className="pt-2">
            <span className="font-semibold uppercase text-[11px] tracking-wider text-gray-500 dark:text-gray-400 block mb-2">
              Final Ratification Vote
            </span>
            <div className="p-3.5 rounded-[12px] border border-gray-200/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 dark:text-gray-100">Decision:</span>
                <Badge
                  variant={ratificationVote.vote === 'SIGN_OFF' ? 'success' : 'danger'}
                  size="xs"
                >
                  {ratificationVote.vote.replace(/_/g, ' ')}
                </Badge>
              </div>
              {ratificationVote.closingComment && (
                <p className="text-gray-600 dark:text-gray-300 italic text-[11px] mt-1">
                  &ldquo;{ratificationVote.closingComment}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

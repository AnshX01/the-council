'use client';

import React, { useEffect } from 'react';
import { PersonaProfile } from '@/types/persona';
import {
  OpeningPosition,
  CrossExamRound,
  RatificationVote,
  ShiftRecord,
} from '@/types/session';
import { X, Shield, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!persona) return null;

  const personaShifts = shiftHistory.filter((s) => s.personaId === persona.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f111a] p-6 shadow-2xl transition-smooth"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm"
              style={{
                backgroundColor: `${persona.colorHex}25`,
                color: persona.colorHex,
                border: `1px solid ${persona.colorHex}50`,
              }}
            >
              {persona.name.slice(0, 2)}
            </div>
            <div>
              <h2
                id="persona-modal-title"
                className="font-serif font-bold text-lg text-gray-900 dark:text-gray-100"
              >
                {persona.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {persona.title} &bull; {persona.archetype}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-smooth"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cognitive Directives */}
        <div className="py-4 border-b border-gray-100 dark:border-gray-800 space-y-3 text-xs">
          <div>
            <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Core Values:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {persona.coreValues.map((v, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px]"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Reasoning Style:
              </span>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-[11px]">
                {persona.reasoningStyle}
              </p>
            </div>

            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Blind Spots:
              </span>
              <p className="text-amber-700/90 dark:text-amber-300/80 leading-relaxed text-[11px]">
                {persona.blindSpots}
              </p>
            </div>
          </div>
        </div>

        {/* Initial Stance */}
        {openingPosition && (
          <div className="py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Initial Opening Stance (Phase 1)
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {openingPosition.confidenceScore}% confidence
              </span>
            </div>
            <p className="text-xs font-medium text-gray-900 dark:text-gray-200 italic mb-2">
              &ldquo;{openingPosition.positionSummary}&rdquo;
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
              {openingPosition.detailedReasoning}
            </p>
            <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Falsification Condition:
              </span>{' '}
              <span className="text-gray-600 dark:text-gray-400">
                {openingPosition.falsificationCondition}
              </span>
            </div>
          </div>
        )}

        {/* Position Movement Across Rounds */}
        <div className="py-4 border-b border-gray-100 dark:border-gray-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-3">
            Trajectory & Position Movement
          </span>

          {personaShifts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No position shifts recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {personaShifts.map((shift, i) => {
                const isUp = shift.deltaConfidence > 0;
                return (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
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

                    <p className="text-gray-800 dark:text-gray-200 mb-1 font-medium">
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
          <div className="pt-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
              Final Ratification Vote
            </span>
            <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900 dark:text-gray-100">Decision:</span>
                <span
                  className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                    ratificationVote.vote === 'SIGN_OFF'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}
                >
                  {ratificationVote.vote.replace(/_/g, ' ')}
                </span>
              </div>
              {ratificationVote.closingComment && (
                <p className="text-gray-600 dark:text-gray-400 italic text-[11px] mt-1">
                  &ldquo;{ratificationVote.closingComment}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

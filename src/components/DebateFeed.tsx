'use client';

import React, { useState } from 'react';
import { CouncilSSEEvent } from '@/types/events';
import { getPersonaById, ALL_PERSONAS } from '@/lib/council/personas';
import { PersonaId } from '@/types/persona';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface DebateFeedProps {
  events: CouncilSSEEvent[];
  onSelectPersona?: (personaId: PersonaId) => void;
}

export function DebateFeed({ events, onSelectPersona }: DebateFeedProps) {
  const [filterPersona, setFilterPersona] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');

  // Filter events to only meaningful narrative messages
  const narrativeEvents = events.filter((e) => {
    if (
      e.event !== 'persona_message' &&
      e.event !== 'position_update' &&
      e.event !== 'moderator_draft' &&
      e.event !== 'ratification_vote'
    ) {
      return false;
    }

    if (filterPersona !== 'all') {
      const pId = (e.payload as any)?.personaId;
      if (pId !== filterPersona) return false;
    }

    if (filterPhase !== 'all') {
      if (filterPhase === 'cross_exam') {
        const isCrossExam =
          (e.payload as any)?.phase === 'PHASE_2_CROSS_EXAM' ||
          (e.payload as any)?.roundNumber !== undefined ||
          e.event === 'position_update' ||
          e.event === 'moderator_draft';
        if (!isCrossExam) return false;
      } else if (filterPhase === 'opening') {
        const isOpening =
          (e.payload as any)?.phase === 'PHASE_1_OPENING';
        if (!isOpening) return false;
      } else if (filterPhase === 'ratification') {
        const isRatification =
          (e.payload as any)?.phase === 'PHASE_4_RATIFICATION' ||
          e.event === 'ratification_vote';
        if (!isRatification) return false;
      }
    }

    return true;
  });

  return (
    <div className="w-full rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/40 p-4 sm:p-5 backdrop-blur-sm shadow-sm">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-200/60 dark:border-gray-800/60 gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-serif font-semibold text-sm text-gray-900 dark:text-gray-100">
            Deliberation Transcript
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
            {narrativeEvents.length} utterances
          </span>
        </div>

        {/* Phase Filter Chips & Persona Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterPhase('all')}
              className={`px-2 py-0.5 rounded-md font-medium transition-smooth ${
                filterPhase === 'all'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterPhase('cross_exam')}
              className={`px-2 py-0.5 rounded-md font-medium transition-smooth ${
                filterPhase === 'cross_exam'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Cross-Examination
            </button>
            <button
              onClick={() => setFilterPhase('ratification')}
              className={`px-2 py-0.5 rounded-md font-medium transition-smooth ${
                filterPhase === 'ratification'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Ratification
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterPersona}
              onChange={(e) => setFilterPersona(e.target.value)}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none"
              aria-label="Filter transcript by persona"
            >
              <option value="all">All Voices</option>
              {ALL_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ARIA Live Region for Streamed Updates */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="space-y-4 max-h-[550px] overflow-y-auto pr-1"
      >
        {narrativeEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400 dark:text-gray-500">
            Chamber is in preparation. Deliberation transcript will stream here in real time.
          </div>
        ) : (
          narrativeEvents.map((evt, idx) => (
            <TranscriptItem
              key={`${evt.event}-${evt.timestamp}-${idx}`}
              event={evt}
              onSelectPersona={onSelectPersona}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TranscriptItem({
  event,
  onSelectPersona,
}: {
  event: CouncilSSEEvent;
  onSelectPersona?: (personaId: PersonaId) => void;
}) {
  if (event.event === 'persona_message') {
    const { personaId, content, confidenceScore, roundNumber } = event.payload;
    const persona = getPersonaById(personaId);

    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800/70 bg-gray-50/50 dark:bg-gray-900/30 transition-smooth">
        <button
          onClick={() => onSelectPersona?.(personaId)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 cursor-pointer hover:opacity-80 transition-smooth"
          style={{
            backgroundColor: `${persona.colorHex}20`,
            color: persona.colorHex,
            border: `1px solid ${persona.colorHex}50`,
          }}
          title={`View ${persona.name} cognitive profile`}
        >
          {persona.name.slice(0, 2)}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectPersona?.(personaId)}
                className="font-serif font-semibold text-xs text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-smooth text-left"
              >
                {persona.name}
              </button>
              {roundNumber && (
                <span className="text-[10px] font-mono text-gray-400">
                  Round {roundNumber}
                </span>
              )}
            </div>

            {confidenceScore !== undefined && (
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {confidenceScore}% confidence
              </span>
            )}
          </div>

          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
            {content}
          </p>
        </div>
      </div>
    );
  }

  if (event.event === 'position_update') {
    const {
      personaId,
      roundNumber,
      previousConfidence,
      newConfidence,
      deltaConfidence,
      catalystPersonaIds,
      shiftRationale,
    } = event.payload;
    const persona = getPersonaById(personaId);
    const isUp = deltaConfidence > 0;

    return (
      <div className="ml-6 pl-3 border-l-2 border-indigo-500/40 py-1 text-xs">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            {persona.name} Shifted Stance (R{roundNumber}):
          </span>
          <span className="font-mono flex items-center gap-1 font-medium">
            {previousConfidence}% &rarr; {newConfidence}%
            {deltaConfidence !== 0 && (
              <span
                className={`inline-flex items-center gap-0.5 font-bold ${
                  isUp ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUp ? `+${deltaConfidence}` : deltaConfidence}%
              </span>
            )}
          </span>
        </div>

        {catalystPersonaIds.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 mb-1">
            <span>Catalysts:</span>
            {catalystPersonaIds.map((id) => (
              <button
                key={id}
                onClick={() => onSelectPersona?.(id)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                @{getPersonaById(id).name}
              </button>
            ))}
          </div>
        )}

        <p className="text-[11px] italic text-gray-600 dark:text-gray-400 line-clamp-2">
          &ldquo;{shiftRationale}&rdquo;
        </p>
      </div>
    );
  }

  if (event.event === 'moderator_draft') {
    const { draftRound, draftConsensusText, alignmentScore, remainingDisagreements } =
      event.payload;

    return (
      <div className="my-2 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-serif font-semibold text-indigo-900 dark:text-indigo-300">
            Round {draftRound} Consensus Synthesis &bull; The Arbiter
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold">
            {Math.round(alignmentScore)}% Alignment
          </span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">
          {draftConsensusText}
        </p>
        {remainingDisagreements.length > 0 && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 pt-1 border-t border-indigo-200/50 dark:border-indigo-900/40">
            <span className="font-medium text-amber-600 dark:text-amber-400">Open Disagreements: </span>
            {remainingDisagreements.join(' | ')}
          </div>
        )}
      </div>
    );
  }

  if (event.event === 'ratification_vote') {
    const { personaId, cycleNumber, vote, amendmentText, objectionReason, closingComment } =
      event.payload;
    const persona = getPersonaById(personaId);

    return (
      <div className="flex items-start gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 text-xs">
        <div className="pt-0.5">
          {vote === 'SIGN_OFF' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : vote === 'SIGN_OFF_WITH_AMENDMENT' ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-gray-900 dark:text-gray-100">
              {persona.name}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                vote === 'SIGN_OFF'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : vote === 'SIGN_OFF_WITH_AMENDMENT'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
              }`}
            >
              {vote.replace(/_/g, ' ')}
            </span>
          </div>

          {amendmentText && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Amendment:</span> &ldquo;{amendmentText}&rdquo;
            </p>
          )}

          {objectionReason && (
            <p className="mt-1 text-xs text-red-700 dark:text-red-300">
              <span className="font-semibold">Dissent:</span> &ldquo;{objectionReason}&rdquo;
            </p>
          )}

          {closingComment && (
            <p className="mt-1 text-gray-500 dark:text-gray-400 italic text-[11px]">
              &ldquo;{closingComment}&rdquo;
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

'use client';

import React, { useState } from 'react';
import { CouncilSSEEvent } from '@/types/events';
import { findPersonaById, ALL_PERSONAS } from '@/lib/council/personas';
import { PersonaId } from '@/types/persona';
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Swords,
  Handshake,
  CornerDownRight,
  Check,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

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
      const targetId = (e.payload as any)?.targetPersonaId;
      if (pId !== filterPersona && targetId !== filterPersona) return false;
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
    <GlassCard padded="md" className="w-full !rounded-[16px] space-y-4">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-gray-950 dark:text-gray-50 leading-tight">
              Deliberation Transcript
            </h3>
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
              {narrativeEvents.length} recorded utterances
            </span>
          </div>
        </div>

        {/* Phase Filter Chips & Persona Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Control Buttons (preserving button text for E2E tests) */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-white/[0.06] p-1 rounded-[10px] border border-gray-200/80 dark:border-white/10 text-xs">
            <button
              onClick={() => setFilterPhase('all')}
              className={`px-2.5 py-1 rounded-[8px] font-medium transition-all select-none ${
                filterPhase === 'all'
                  ? 'bg-white dark:bg-white/15 text-gray-950 dark:text-white shadow-xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterPhase('cross_exam')}
              className={`px-2.5 py-1 rounded-[8px] font-medium transition-all select-none ${
                filterPhase === 'cross_exam'
                  ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Cross-Examination
            </button>
            <button
              onClick={() => setFilterPhase('ratification')}
              className={`px-2.5 py-1 rounded-[8px] font-medium transition-all select-none ${
                filterPhase === 'ratification'
                  ? 'bg-white dark:bg-white/15 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
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
              className="text-xs bg-white/70 dark:bg-white/[0.08] border border-gray-200/90 dark:border-white/15 rounded-[10px] px-2.5 py-1.5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
        className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1.5"
      >
        {narrativeEvents.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center justify-center mx-auto mb-2 text-gray-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Chamber is currently preparing
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Live deliberation utterances will stream here in real time.
            </p>
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
    </GlassCard>
  );
}

function formatDialogueWithMentions(
  content: string,
  onSelectPersona?: (personaId: PersonaId) => void
) {
  if (!content) return null;
  // Match @Word or @The Word or @word_word
  const parts = content.split(/(@(?:The\s+\w+|\w+))/g);

  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const mentionClean = part.slice(1).trim().toLowerCase().replace(/\s+/g, '_');
      const matched = ALL_PERSONAS.find(
        (p) =>
          p.id.toLowerCase() === mentionClean ||
          p.name.toLowerCase() === part.slice(1).trim().toLowerCase() ||
          p.name.toLowerCase().replace('the ', '') === mentionClean
      );

      if (matched) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectPersona?.(matched.id)}
            className="inline-flex items-center font-semibold px-1.5 py-0.5 mx-0.5 rounded-[6px] text-[11px] hover:opacity-85 transition-opacity align-baseline"
            style={{
              backgroundColor: `${matched.colorHex}18`,
              color: matched.colorHex,
              border: `1px solid ${matched.colorHex}35`,
            }}
          >
            {part}
          </button>
        );
      }
      return (
        <span key={i} className="font-semibold text-indigo-600 dark:text-indigo-400">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function TranscriptItem({
  event,
  onSelectPersona,
}: {
  event: CouncilSSEEvent;
  onSelectPersona?: (personaId: PersonaId) => void;
}) {
  if (event.event === 'persona_message') {
    const {
      personaId,
      content,
      confidenceScore,
      roundNumber,
      dialogueType,
      targetPersonaId,
      action,
    } = event.payload;
    const persona = findPersonaById(personaId);
    if (!persona) return null;

    // 1. Flowing Peer-to-Peer Jury Conversation Turn
    if (dialogueType === 'peer_response') {
      const targetPersona = targetPersonaId ? findPersonaById(targetPersonaId) : null;

      const renderActionBadge = () => {
        if (action === 'CHALLENGE') {
          return (
            <Badge variant="danger" size="xs" icon={<Swords className="w-3 h-3 text-red-500" />}>
              Challenges
            </Badge>
          );
        }
        if (action === 'AGREE') {
          return (
            <Badge variant="success" size="xs" icon={<Handshake className="w-3 h-3 text-emerald-500" />}>
              Concurs
            </Badge>
          );
        }
        if (action === 'CONCEDE') {
          return (
            <Badge variant="warning" size="xs" icon={<CornerDownRight className="w-3 h-3 text-amber-500" />}>
              Concedes
            </Badge>
          );
        }
        return null;
      };

      return (
        <div
          className="flex items-start gap-3 p-3.5 rounded-[14px] border border-gray-200/70 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] backdrop-blur-md shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all"
          style={{ borderLeftWidth: '3.5px', borderLeftColor: persona.colorHex }}
        >
          <button
            onClick={() => onSelectPersona?.(personaId)}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity mt-0.5"
            style={{
              backgroundColor: `${persona.colorHex}20`,
              color: persona.colorHex,
              border: `1px solid ${persona.colorHex}45`,
            }}
            title={`View ${persona.name} profile`}
          >
            {persona.name.slice(0, 2)}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => onSelectPersona?.(personaId)}
                  className="font-serif font-bold text-xs text-gray-950 dark:text-gray-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {persona.name}
                </button>

                <ArrowRight className="w-3 h-3 text-gray-400" />

                {targetPersona && (
                  <button
                    onClick={() => onSelectPersona?.(targetPersona.id)}
                    className="font-serif font-semibold text-xs px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: `${targetPersona.colorHex}15`,
                      color: targetPersona.colorHex,
                      border: `1px solid ${targetPersona.colorHex}30`,
                    }}
                    title={`View ${targetPersona.name} profile`}
                  >
                    {targetPersona.name}
                  </button>
                )}

                {renderActionBadge()}
              </div>

              {roundNumber && (
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                  Round {roundNumber} Colloquy
                </span>
              )}
            </div>

            <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-sans bg-black/[0.02] dark:bg-white/[0.03] p-2.5 rounded-[10px] border border-gray-100 dark:border-white/5">
              {formatDialogueWithMentions(content, onSelectPersona)}
            </div>
          </div>
        </div>
      );
    }

    // 2. Stance Checkpoint Turn (Cross-Exam Position Statement)
    if (dialogueType === 'position_statement') {
      return (
        <div className="flex items-start gap-3 p-3 rounded-[12px] border border-indigo-200/60 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20 backdrop-blur-md">
          <button
            onClick={() => onSelectPersona?.(personaId)}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: `${persona.colorHex}20`,
              color: persona.colorHex,
              border: `1px solid ${persona.colorHex}45`,
            }}
            title={`View ${persona.name} profile`}
          >
            {persona.name.slice(0, 2)}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectPersona?.(personaId)}
                  className="font-serif font-bold text-xs text-gray-950 dark:text-gray-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                >
                  {persona.name}
                </button>
                <Badge variant="accent" size="xs">
                  Stance Checkpoint
                </Badge>
                {roundNumber && (
                  <span className="text-[10px] font-mono text-gray-400">
                    Round {roundNumber}
                  </span>
                )}
              </div>

              {confidenceScore !== undefined && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-gray-200/70 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                  {confidenceScore}% confidence
                </span>
              )}
            </div>

            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
              {formatDialogueWithMentions(content, onSelectPersona)}
            </p>
          </div>
        </div>
      );
    }

    // 3. Opening Position / Default Persona Message
    return (
      <div className="flex items-start gap-3 p-3 rounded-[12px] border border-gray-200/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] backdrop-blur-md">
        <button
          onClick={() => onSelectPersona?.(personaId)}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            backgroundColor: `${persona.colorHex}20`,
            color: persona.colorHex,
            border: `1px solid ${persona.colorHex}45`,
          }}
          title={`View ${persona.name} profile`}
        >
          {persona.name.slice(0, 2)}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectPersona?.(personaId)}
                className="font-serif font-bold text-xs text-gray-950 dark:text-gray-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
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
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-gray-200/70 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                {confidenceScore}% confidence
              </span>
            )}
          </div>

          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
            {formatDialogueWithMentions(content, onSelectPersona)}
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
    const persona = findPersonaById(personaId);
    if (!persona) return null;
    const isUp = deltaConfidence > 0;

    return (
      <div className="ml-6 pl-3 border-l-2 border-indigo-500/40 py-1 text-xs">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-1">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
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
            {catalystPersonaIds.map((id) => {
              const catalystPersona = findPersonaById(id);
              return (
                <button
                  key={id}
                  onClick={() => onSelectPersona?.(id)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  @{catalystPersona ? catalystPersona.name : id}
                </button>
              );
            })}
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
      <div className="my-2 p-3.5 rounded-[12px] border border-indigo-300/60 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/30 backdrop-blur-md text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-serif font-bold text-indigo-950 dark:text-indigo-200">
            Round {draftRound} Consensus Synthesis &bull; The Arbiter
          </span>
          <Badge variant="accent" size="xs">
            {Math.round(alignmentScore)}% Alignment
          </Badge>
        </div>
        <p className="text-gray-800 dark:text-gray-200 mb-2 leading-relaxed">
          {draftConsensusText}
        </p>
        {remainingDisagreements.length > 0 && (
          <div className="text-[11px] text-gray-600 dark:text-gray-400 pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/40">
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
    const persona = findPersonaById(personaId);
    if (!persona) return null;

    return (
      <div className="flex items-start gap-3 p-3 rounded-[12px] border border-gray-200/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.03] backdrop-blur-md text-xs">
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
            <span className="font-serif font-bold text-gray-950 dark:text-gray-50">
              {persona.name}
            </span>
            <Badge
              variant={
                vote === 'SIGN_OFF'
                  ? 'success'
                  : vote === 'SIGN_OFF_WITH_AMENDMENT'
                  ? 'warning'
                  : 'danger'
              }
              size="xs"
            >
              {vote.replace(/_/g, ' ')}
            </Badge>
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

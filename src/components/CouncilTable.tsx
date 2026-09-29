'use client';

import React from 'react';
import {
  COUNCIL_MEMBERS,
  MODERATOR,
  PersonaProfile,
} from '@/lib/council/personas';
import {
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
  Crown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react';
import { PersonaId } from '@/types/persona';
import { OpeningPosition, CrossExamRound, RatificationVote } from '@/types/session';

interface CouncilTableProps {
  memberStatuses: Record<PersonaId, 'active' | 'unavailable'>;
  currentSpeakerId?: PersonaId;
  openingPositions?: Partial<Record<PersonaId, OpeningPosition>>;
  crossExamRounds?: CrossExamRound[];
  ratificationVotes?: Partial<Record<PersonaId, RatificationVote>>;
  onSelectPersona: (persona: PersonaProfile) => void;
}

const GLYPH_MAP: Record<string, React.ElementType> = {
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
  Crown,
};

export function CouncilTable({
  memberStatuses,
  currentSpeakerId,
  openingPositions = {},
  crossExamRounds = [],
  ratificationVotes = {},
  onSelectPersona,
}: CouncilTableProps) {
  // Extract latest confidence & stance per persona
  const getPersonaCurrentState = (id: PersonaId) => {
    const isUnavailable = memberStatuses[id] === 'unavailable';
    const latestRound = crossExamRounds[crossExamRounds.length - 1];
    const turn = latestRound?.turns[id];
    const opening = openingPositions[id];

    let confidence = turn?.updatedConfidence ?? opening?.confidenceScore ?? null;
    let snippet = turn?.updatedPosition ?? opening?.positionSummary ?? 'Awaiting initial deliberation...';
    let vote = ratificationVotes[id];

    return { isUnavailable, confidence, snippet, vote };
  };

  return (
    <div className="w-full">
      {/* Moderator Bar */}
      <div className="mb-4">
        <div
          onClick={() => onSelectPersona(MODERATOR)}
          className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-smooth ${
            currentSpeakerId === 'moderator'
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500 shadow-sm'
              : 'border-gray-200/80 dark:border-gray-800/80 bg-white/60 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {MODERATOR.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  Chair / Non-Voting
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {MODERATOR.title} &bull; Neutral arbiter, convergence evaluator & final scribe
              </p>
            </div>
          </div>
          {currentSpeakerId === 'moderator' && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              Speaking
            </span>
          )}
        </div>
      </div>

      {/* 8 Voting Members Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COUNCIL_MEMBERS.map((member) => {
          const { isUnavailable, confidence, snippet, vote } = getPersonaCurrentState(member.id);
          const GlyphComponent = GLYPH_MAP[member.avatarGlyph] || ShieldGlyph;
          const isSpeaking = currentSpeakerId === member.id;

          return (
            <div
              key={member.id}
              onClick={() => onSelectPersona(member)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectPersona(member)}
              className={`group relative rounded-xl border p-3.5 transition-smooth cursor-pointer flex flex-col justify-between ${
                isUnavailable
                  ? 'opacity-40 border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/20'
                  : isSpeaking
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-md'
                  : 'border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shadow-xs"
                      style={{
                        backgroundColor: `${member.colorHex}18`,
                        color: member.colorHex,
                        border: `1px solid ${member.colorHex}40`,
                      }}
                    >
                      <GlyphComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-semibold text-xs text-gray-900 dark:text-gray-100 leading-tight">
                        {member.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-sans block leading-tight">
                        {member.title}
                      </span>
                    </div>
                  </div>

                  {/* Status / Vote Badge */}
                  {isUnavailable ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                      <MinusCircle className="w-3 h-3" />
                      Offline
                    </span>
                  ) : vote ? (
                    vote.vote === 'SIGN_OFF' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Signed
                      </span>
                    ) : vote.vote === 'SIGN_OFF_WITH_AMENDMENT' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Amend
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-medium">
                        <XCircle className="w-3 h-3" />
                        Dissent
                      </span>
                    )
                  ) : isSpeaking ? (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                      Active
                    </span>
                  ) : null}
                </div>

                {/* Stance Snippet */}
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic leading-relaxed mb-3">
                  &ldquo;{snippet}&rdquo;
                </p>
              </div>

              {/* Confidence Metric Footer */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400">
                  Confidence
                </span>
                {confidence !== null ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${confidence}%`,
                          backgroundColor: member.colorHex,
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {confidence}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400">&mdash;</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShieldGlyph(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" />
    </svg>
  );
}

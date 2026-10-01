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
  Volume2,
} from 'lucide-react';
import { PersonaId } from '@/types/persona';
import { OpeningPosition, CrossExamRound, RatificationVote } from '@/types/session';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

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

  const isModeratorSpeaking = currentSpeakerId === 'moderator';

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Moderator Bar */}
      <GlassCard
        onClick={() => onSelectPersona(MODERATOR)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectPersona(MODERATOR)}
        padded="sm"
        interactive
        className={`flex items-center justify-between !rounded-[16px] cursor-pointer transition-all duration-200 ${
          isModeratorSpeaking
            ? '!border-indigo-500/70 dark:!border-indigo-400/80 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
            : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20 shrink-0">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-gray-950 dark:text-gray-50">
                {MODERATOR.name}
              </span>
              <Badge variant="neutral" size="xs">
                Chair &bull; Non-Voting
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
              {MODERATOR.title} &bull; Neutral protocol arbiter, convergence measurement, verdict scribe
            </p>
          </div>
        </div>

        {isModeratorSpeaking && (
          <Badge variant="accent" size="sm" dot icon={<Volume2 className="w-3 h-3" />}>
            Speaking
          </Badge>
        )}
      </GlassCard>

      {/* 8 Voting Members Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COUNCIL_MEMBERS.map((member) => {
          const { isUnavailable, confidence, snippet, vote } = getPersonaCurrentState(member.id);
          const GlyphComponent = GLYPH_MAP[member.avatarGlyph] || ShieldGlyph;
          const isSpeaking = currentSpeakerId === member.id;

          return (
            <GlassCard
              key={member.id}
              onClick={() => onSelectPersona(member)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectPersona(member)}
              padded="sm"
              interactive={!isUnavailable}
              className={`flex flex-col justify-between !rounded-[16px] text-left transition-all duration-200 select-none ${
                isUnavailable
                  ? 'opacity-40 cursor-not-allowed bg-black/5 dark:bg-white/5'
                  : isSpeaking
                  ? '!border-indigo-500/80 dark:!border-indigo-400 ring-2 ring-indigo-500/25 shadow-md -translate-y-1'
                  : ''
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-[10px] flex items-center justify-center text-xs shadow-xs shrink-0"
                      style={{
                        backgroundColor: `${member.colorHex}18`,
                        color: member.colorHex,
                        border: `1px solid ${member.colorHex}40`,
                      }}
                    >
                      <GlyphComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-gray-950 dark:text-gray-50 leading-tight">
                        {member.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block leading-tight mt-0.5">
                        {member.archetype}
                      </span>
                    </div>
                  </div>

                  {/* Status / Vote Badge */}
                  {isUnavailable ? (
                    <Badge variant="neutral" size="xs" icon={<MinusCircle className="w-3 h-3" />}>
                      Offline
                    </Badge>
                  ) : vote ? (
                    vote.vote === 'SIGN_OFF' ? (
                      <Badge variant="success" size="xs" icon={<CheckCircle2 className="w-3 h-3" />}>
                        Signed
                      </Badge>
                    ) : vote.vote === 'SIGN_OFF_WITH_AMENDMENT' ? (
                      <Badge variant="warning" size="xs" icon={<AlertTriangle className="w-3 h-3" />}>
                        Amend
                      </Badge>
                    ) : (
                      <Badge variant="danger" size="xs" icon={<XCircle className="w-3 h-3" />}>
                        Dissent
                      </Badge>
                    )
                  ) : isSpeaking ? (
                    <Badge variant="accent" size="xs" dot icon={<Volume2 className="w-3 h-3" />}>
                      Active
                    </Badge>
                  ) : null}
                </div>

                {/* Stance Snippet */}
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic leading-relaxed mb-3">
                  &ldquo;{snippet}&rdquo;
                </p>
              </div>

              {/* Confidence Metric Footer */}
              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Confidence
                </span>
                {confidence !== null ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-gray-200/80 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${confidence}%`,
                          backgroundColor: member.colorHex,
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {confidence}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 font-mono">&mdash;</span>
                )}
              </div>
            </GlassCard>
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

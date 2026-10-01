'use client';

import React from 'react';
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
  AlertTriangle,
  XCircle,
  Volume2,
  MinusCircle,
} from 'lucide-react';
import { PersonaProfile } from '@/types/persona';
import { RatificationVote } from '@/types/session';

export interface SeatNodeProps {
  persona: PersonaProfile;
  x: number;
  y: number;
  seatRadius: number;
  isModerator: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
  isUnavailable?: boolean;
  confidence: number | null;
  confidenceDelta?: number | null;
  vote?: RatificationVote;
  isSelected?: boolean;
  focused?: boolean;
  onClick: () => void;
  onFocus?: () => void;
}

const GLYPH_MAP: Record<string, React.ElementType> = {
  Crown,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
};

export const SeatNode: React.FC<SeatNodeProps> = ({
  persona,
  x,
  y,
  seatRadius = 26,
  isModerator,
  isSpeaking,
  isThinking = false,
  isUnavailable = false,
  confidence,
  confidenceDelta,
  vote,
  isSelected = false,
  focused = false,
  onClick,
  onFocus,
}) => {
  const GlyphComponent = GLYPH_MAP[persona.avatarGlyph] || Crown;
  const color = persona.colorHex || (isModerator ? '#64748B' : '#3B82F6');

  // Confidence ring math
  const ringRadius = seatRadius + 4;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset =
    confidence !== null
      ? circumference - (circumference * Math.min(100, Math.max(0, confidence))) / 100
      : circumference;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${seatRadius * 2 + 16}px`,
        height: `${seatRadius * 2 + 16}px`,
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center select-none"
    >
      <button
        type="button"
        role="button"
        tabIndex={0}
        aria-label={`${persona.name}${isModerator ? ' (Moderator)' : ''}${
          isSpeaking ? ', currently speaking' : ''
        }${confidence !== null ? `, confidence ${confidence}%` : ''}`}
        aria-pressed={isSelected}
        onClick={onClick}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        className={`group relative flex items-center justify-center rounded-full transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black ${
          isUnavailable
            ? 'opacity-40 cursor-not-allowed filter grayscale'
            : 'cursor-pointer hover:scale-105 active:scale-95'
        } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-black' : ''}`}
        style={{
          width: `${seatRadius * 2 + 8}px`,
          height: `${seatRadius * 2 + 8}px`,
        }}
      >
        {/* SVG Confidence Ring */}
        <svg
          className="absolute inset-0 pointer-events-none -rotate-90"
          width={seatRadius * 2 + 8}
          height={seatRadius * 2 + 8}
          viewBox={`0 0 ${(seatRadius + 4) * 2} ${(seatRadius + 4) * 2}`}
        >
          {/* Background track */}
          <circle
            cx={seatRadius + 4}
            cy={seatRadius + 4}
            r={ringRadius}
            fill="none"
            stroke="currentColor"
            className="text-black/5 dark:text-white/10"
            strokeWidth={2.5}
          />
          {/* Active progress */}
          {!isUnavailable && confidence !== null && (
            <circle
              cx={seatRadius + 4}
              cy={seatRadius + 4}
              r={ringRadius}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Live Speaking Pulsing Halo */}
        {isSpeaking && !isUnavailable && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-30 pointer-events-none"
            style={{ backgroundColor: color }}
          />
        )}

        {/* Seat Node Glass Avatar Circle */}
        <div
          className={`relative flex items-center justify-center rounded-full glass-panel shadow-sm transition-all duration-200 ${
            isSpeaking ? 'shadow-lg' : ''
          }`}
          style={{
            width: `${seatRadius * 2}px`,
            height: `${seatRadius * 2}px`,
            backgroundColor: isSpeaking
              ? `${color}25`
              : `${color}12`,
            borderColor: isSpeaking ? color : `${color}40`,
            boxShadow: isSpeaking
              ? `0 0 20px -2px ${color}80, 0 4px 12px rgba(0,0,0,0.15)`
              : undefined,
          }}
        >
          <GlyphComponent
            className="transition-transform duration-200 group-hover:scale-110"
            style={{
              width: `${Math.round(seatRadius * 0.9)}px`,
              height: `${Math.round(seatRadius * 0.9)}px`,
              color,
            }}
          />

          {/* Offline indicator */}
          {isUnavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
              <MinusCircle className="w-4 h-4 text-white" />
            </div>
          )}

          {/* Speaking volume indicator */}
          {isSpeaking && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <Volume2 className="w-2.5 h-2.5 animate-pulse" />
            </span>
          )}
        </div>

        {/* Ballot Chip (Ratification Vote) */}
        {vote && !isUnavailable && (
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full shadow-xs bg-white dark:bg-black">
            {vote.vote === 'SIGN_OFF' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
            ) : vote.vote === 'SIGN_OFF_WITH_AMENDMENT' ? (
              <AlertTriangle className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            )}
          </span>
        )}

        {/* Delta Chip (+/- % shift) */}
        {confidenceDelta !== undefined && confidenceDelta !== null && confidenceDelta !== 0 && !isUnavailable && (
          <span
            className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold leading-tight shadow-2xs ${
              confidenceDelta > 0
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            }`}
          >
            {confidenceDelta > 0 ? `+${confidenceDelta}%` : `${confidenceDelta}%`}
          </span>
        )}
      </button>

      {/* Label under node */}
      <div className="absolute top-full mt-1.5 flex flex-col items-center pointer-events-none text-center">
        <span className="text-[11px] font-medium tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap leading-tight">
          {persona.name}
        </span>
        {confidence !== null && !isUnavailable ? (
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 tabular-nums leading-tight">
            {confidence}%
          </span>
        ) : isModerator ? (
          <span className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 leading-tight">
            Chair
          </span>
        ) : null}
      </div>
    </div>
  );
};

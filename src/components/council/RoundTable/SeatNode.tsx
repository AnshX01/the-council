/**
 * Origin: The Council Round Table v3 (Section 6)
 * Seated council persona node with chair-back arc, radial outward labels,
 * confidence ring, delta chips, and status indicators.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
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
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { PersonaProfile } from "@/types/persona";
import { RatificationVote } from "@/types/session";
import { computeOutwardLabelAnchor } from "@/lib/council/geometry";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

export interface SeatNodeProps {
  persona: PersonaProfile;
  x: number;
  y: number;
  seatRadius?: number;
  angleDeg: number;
  isModerator: boolean;
  isSpeaking: boolean;
  isThinking?: boolean;
  isUnavailable?: boolean;
  confidence: number | null;
  confidenceDelta?: number | null;
  vote?: RatificationVote | 'sign_off' | 'amendment' | 'dissent';
  isSelected?: boolean;
  focused?: boolean;
  tabIndex?: number;
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
  angleDeg,
  isModerator,
  isSpeaking,
  isThinking = false,
  isUnavailable = false,
  confidence,
  confidenceDelta,
  vote,
  isSelected = false,
  focused = false,
  tabIndex = -1,
  onClick,
  onFocus,
}) => {
  const GlyphComponent = GLYPH_MAP[persona.avatarGlyph] || Crown;
  const color = persona.colorHex || (isModerator ? "#6366F1" : "#3B82F6");

  const size = isModerator ? 76 : 60;
  const labelAnchor = computeOutwardLabelAnchor(angleDeg);

  // Confidence ring math
  const ringRadius = size / 2 + 4;
  const circumference = 2 * Math.PI * ringRadius;
  const validConf = confidence !== null ? Math.min(100, Math.max(0, confidence)) : 0;
  const strokeDashoffset = circumference - (circumference * validConf) / 100;

  // Accessible Label
  const deltaText =
    confidenceDelta && confidenceDelta !== 0
      ? `, ${confidenceDelta > 0 ? "up " + confidenceDelta : "down " + Math.abs(confidenceDelta)}`
      : "";
  const statusText = isUnavailable
    ? "unavailable"
    : isSpeaking
    ? "speaking"
    : isThinking
    ? "thinking"
    : "idle";
  const ariaLabel = `${persona.name}, ${isModerator ? "Chair" : statusText}${
    confidence !== null ? `, confidence ${confidence} percent${deltaText}` : ""
  }`;

  return (
    <div
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${size + 24}px`,
        height: `${size + 24}px`,
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center select-none"
    >
      {/* Outward Chair-Back Arc SVG */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
      >
        <circle
          cx={(size + 24) / 2}
          cy={(size + 24) / 2}
          r={size / 2 + 8}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeOpacity={0.35}
          strokeDasharray={`${(size + 8) * 0.9} ${(size + 8) * 2}`}
          transform={`rotate(${angleDeg + 90}, ${(size + 24) / 2}, ${(size + 24) / 2})`}
        />
      </svg>

      <button
        type="button"
        role="button"
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        onClick={onClick}
        onFocus={onFocus}
        className={cn(
          "relative flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 outline-none",
          isModerator ? "w-[76px] h-[76px]" : "w-[60px] h-[60px]",
          "bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] shadow-none",
          isUnavailable ? "opacity-35 grayscale" : "opacity-100",
          focused && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]",
          isSelected && "ring-2 ring-[var(--accent)]",
          isSpeaking && "scale-[1.06]"
        )}
      >
        {/* Speaking Concentric Halo Rings */}
        {isSpeaking && (
          <>
            <span className="absolute -inset-2 rounded-full border-2 border-[var(--accent)] animate-ping opacity-25 pointer-events-none" />
            <span className="absolute -inset-1 rounded-full border border-[var(--accent)] opacity-60 pointer-events-none" />
          </>
        )}

        {/* Confidence Progress Ring SVG */}
        {!isModerator && confidence !== null && (
          <svg
            aria-hidden="true"
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              className="stroke-[var(--bg-secondary)]"
              strokeWidth={2.5}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-500 ease-out"
            />
          </svg>
        )}

        {/* Persona Glyph Concentric Inner Disc */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            isModerator ? "w-12 h-12" : "w-10 h-10"
          )}
          style={{ color }}
        >
          <GlyphComponent size={isModerator ? 26 : 20} strokeWidth={2} />
        </div>

        {/* Moderator "CHAIR" Nameplate Badge */}
        {isModerator && (
          <div className="absolute -bottom-2 bg-[var(--accent)] text-[var(--bg-primary)] px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase shadow-none">
            CHAIR
          </div>
        )}

        {/* Ballot Badge (Ratification Phase) */}
        {vote && (() => {
          const voteVal = typeof vote === "string" ? vote.toLowerCase() : ((vote as any).vote || (vote as any).decision || "").toLowerCase();
          const isSignOff = voteVal.includes("sign_off") || voteVal === "agree";
          const isAmendment = voteVal.includes("amendment");
          return (
            <div
              className={cn(
                "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                isSignOff
                  ? "bg-[var(--status-low)] text-black"
                  : isAmendment
                  ? "bg-[var(--status-medium)] text-black"
                  : "bg-[var(--status-urgent)] text-white"
              )}
              title={`Ballot: ${typeof vote === "string" ? vote : (vote as any).vote || (vote as any).decision}`}
            >
              {isSignOff ? "✓" : isAmendment ? "✎" : "✕"}
            </div>
          );
        })()}
      </button>

      {/* Radially Outward Name & Confidence Label */}
      <div
        className={cn(
          "absolute pointer-events-none flex flex-col items-center gap-0.5 whitespace-nowrap z-20",
          labelAnchor === "top" && "bottom-full mb-1.5",
          labelAnchor === "bottom" && "top-full mt-1.5",
          labelAnchor === "left" && "right-full mr-2",
          labelAnchor === "right" && "left-full ml-2",
          labelAnchor === "top-left" && "bottom-full right-1/2 mb-1",
          labelAnchor === "top-right" && "bottom-full left-1/2 mb-1",
          labelAnchor === "bottom-left" && "top-full right-1/2 mt-1",
          labelAnchor === "bottom-right" && "top-full left-1/2 mt-1"
        )}
      >
        <span className="text-[11px] font-medium text-[var(--text-primary)]">
          {persona.name}
        </span>
        {!isModerator && confidence !== null && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)]">
            <span>{confidence}%</span>
            {confidenceDelta !== undefined && confidenceDelta !== null && confidenceDelta !== 0 && (
              <span
                className={cn(
                  "font-bold",
                  confidenceDelta > 0 ? "text-[var(--status-low)]" : "text-[var(--status-urgent)]"
                )}
              >
                {confidenceDelta > 0 ? `▲ +${confidenceDelta}` : `▼ ${confidenceDelta}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

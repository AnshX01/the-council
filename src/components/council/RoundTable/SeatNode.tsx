/**
 * Origin: The Council Round Table v3 / v4 (Section 6 & RT4 §1-§5)
 * Seated council persona node with effortless true circles, clean single-arc
 * confidence ring (seamless 100% full circle), radial outward labels, and status indicators.
 * Fully responsive across desktop (640px) and mobile viewports (<400px).
 */

"use client";

import React from "react";
import { PersonaGlyph } from "@/components/council/PersonaGlyph";
import { PersonaProfile } from "@/types/persona";
import { RatificationVote } from "@/types/session";
import { TABLE_CONSTANTS, computeOutwardLabelAnchor } from "@/lib/council/geometry";
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
  const color = persona.colorHex || (isModerator ? "#6366F1" : "#3B82F6");

  // Confidence ring geometry: normalized in 64x64 SVG space (r=28)
  const ringSvgSize = 64;
  const ringRadius = 28;
  const circumference = 2 * Math.PI * ringRadius;
  const validConf = confidence !== null ? Math.min(100, Math.max(0, confidence)) : 0;
  const strokeDashoffset = circumference - (circumference * validConf) / 100;

  const labelAnchor = computeOutwardLabelAnchor(angleDeg);

  // Radial outward positioning and alignment based on angle around the table
  const anchorClasses = (() => {
    switch (labelAnchor) {
      case "top":
        return "bottom-full mb-1.5 left-1/2 -translate-x-1/2 items-center text-center";
      case "top-right":
        return "bottom-full left-1/2 mb-1 ml-1 items-start text-left";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-1.5 items-start text-left";
      case "bottom-right":
        return angleDeg > 50 && angleDeg < 90
          ? "top-full left-0 mt-1.5 items-start text-left"
          : "top-full left-1/2 mt-1 ml-1 items-start text-left";
      case "bottom":
        return angleDeg >= 90
          ? "top-full right-0 mt-1.5 items-end text-right"
          : "top-full left-0 mt-1.5 items-start text-left";
      case "bottom-left":
        return angleDeg > 90 && angleDeg < 130
          ? "top-full right-0 mt-1.5 items-end text-right"
          : "top-full right-1/2 mt-1 mr-1 items-end text-right";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-1.5 items-end text-right";
      case "top-left":
        return "bottom-full right-1/2 mb-1 mr-1 items-end text-right";
      default:
        return "bottom-full mb-1.5 left-1/2 -translate-x-1/2 items-center text-center";
    }
  })();

  // Percentage positioning across 640x640 design coordinates for responsive lockstep scaling
  const pctX = (x / TABLE_CONSTANTS.DESIGN_SIZE) * 100;
  const pctY = (y / TABLE_CONSTANTS.DESIGN_SIZE) * 100;

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
        left: `${pctX}%`,
        top: `${pctY}%`,
      }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center select-none",
        isModerator ? "w-14 h-14 sm:w-[72px] sm:h-[72px]" : "w-11 h-11 sm:w-[58px] sm:h-[58px]"
      )}
    >
      {/* Speaking Concentric Halo Ring */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="absolute w-[calc(100%+6px)] h-[calc(100%+6px)] rounded-full border-2 border-[var(--accent)] animate-ping opacity-25" />
          <span className="absolute w-full h-full rounded-full border border-[var(--accent)] opacity-60" />
        </div>
      )}

      {/* Member Confidence Ring: Clean Single Halo Arc (Full Uninterrupted Circle at 100%) */}
      {!isModerator && confidence !== null && (
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none -rotate-90 overflow-visible"
          viewBox={`0 0 ${ringSvgSize} ${ringSvgSize}`}
        >
          {/* Subtle Track */}
          <circle
            cx={ringSvgSize / 2}
            cy={ringSvgSize / 2}
            r={ringRadius}
            stroke="var(--border-subtle)"
            strokeWidth={2}
            fill="none"
            opacity={0.5}
          />
          {/* Progress Arc: True Full Circle when 100%, smooth arc otherwise */}
          {validConf >= 100 ? (
            <circle
              cx={ringSvgSize / 2}
              cy={ringSvgSize / 2}
              r={ringRadius}
              stroke={color}
              strokeWidth={2.5}
              fill="none"
            />
          ) : validConf > 0 ? (
            <circle
              cx={ringSvgSize / 2}
              cy={ringSvgSize / 2}
              r={ringRadius}
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-500 ease-out"
            />
          ) : null}
        </svg>
      )}

      {/* Interactive Avatar Disc Button */}
      <button
        type="button"
        role="button"
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        onClick={onClick}
        onFocus={onFocus}
        className={cn(
          "relative flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 outline-none",
          "bg-[var(--bg-tertiary)] shadow-none",
          isModerator
            ? "w-13 h-13 sm:w-[68px] sm:h-[68px] border border-[var(--border-default)]"
            : "w-10 h-10 sm:w-[52px] sm:h-[52px] border-none",
          isUnavailable ? "opacity-35 grayscale" : "opacity-100",
          focused && "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-primary)]",
          isSelected && "ring-2 ring-[var(--accent)]",
          isSpeaking && "scale-[1.04]"
        )}
      >
        {/* Persona Glyph Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            isModerator ? "w-8 h-8 sm:w-11 sm:h-11" : "w-6 h-6 sm:w-8 sm:h-8"
          )}
          style={{ color }}
        >
          <PersonaGlyph
            persona={persona}
            personaId={persona.id}
            className={isModerator ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-[18px] sm:h-[18px]"}
            strokeWidth={2}
          />
        </div>

        {/* Moderator "CHAIR" Nameplate Badge */}
        {isModerator && (
          <div className="absolute -bottom-1.5 sm:-bottom-2 bg-[var(--accent)] text-[var(--bg-primary)] px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold tracking-wider uppercase shadow-none border border-[var(--border-subtle)]">
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
                "absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-bold",
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

      {/* Radial Outward Name & Confidence Label */}
      <div
        className={cn(
          "absolute pointer-events-none flex flex-col whitespace-nowrap z-20",
          anchorClasses
        )}
      >
        <span className="text-[10px] sm:text-[11px] font-medium text-[var(--text-primary)] leading-tight">
          {persona.name}
        </span>
        {!isModerator && confidence !== null && (
          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-[var(--text-muted)] leading-tight mt-0.5">
            <span>{confidence}%</span>
            {confidenceDelta !== undefined && confidenceDelta !== null && confidenceDelta !== 0 && (
              <span
                className={cn(
                  "font-semibold inline-flex items-center",
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

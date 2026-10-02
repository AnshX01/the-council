/**
 * Origin: The Council Round Table v3 (Section 6)
 * SVG dialogue arc connecting speaker to addressed peer with stance encoding:
 * AGREE: solid with checkmark
 * CHALLENGE: dashed (6 4) with lightning
 * CONCEDE: dotted (1 4) with open hand
 * Trail fading support (1.0 -> 0.6 -> 0.3).
 */

"use client";

import React from "react";
import { computeInteractionArc } from "@/lib/council/geometry";

export type InteractionStance = "AGREE" | "CHALLENGE" | "CONCEDE" | "NEUTRAL";

export interface InteractionArcProps {
  source: { x: number; y: number };
  target: { x: number; y: number };
  center: { x: number; y: number };
  stance?: InteractionStance;
  speakerColor?: string;
  opacity?: number;
  isActive?: boolean;
}

export const InteractionArc: React.FC<InteractionArcProps> = ({
  source,
  target,
  center,
  stance = "AGREE",
  speakerColor = "#6366F1",
  opacity = 1.0,
  isActive = true,
}) => {
  const pathD = computeInteractionArc(source, target, center, { curvature: 0.52 });

  // Stance line styles
  let strokeDasharray = "none";
  let strokeLinecap: "round" | "butt" = "round";
  let markerSymbol = "✓";

  if (stance === "CHALLENGE") {
    strokeDasharray = "6 4";
    markerSymbol = "⚡";
  } else if (stance === "CONCEDE") {
    strokeDasharray = "1 4";
    strokeLinecap = "round";
    markerSymbol = "✋";
  } else if (stance === "AGREE") {
    strokeDasharray = "none";
    markerSymbol = "✓";
  }

  // Midpoint approximation for stance glyph
  const midX = Math.round((source.x + target.x) / 2 + (center.x - (source.x + target.x) / 2) * 0.45);
  const midY = Math.round((source.y + target.y) / 2 + (center.y - (source.y + target.y) / 2) * 0.45);

  return (
    <g
      className="interaction-arc pointer-events-none transition-opacity duration-300 select-none"
      opacity={opacity}
      aria-hidden="true"
    >
      {/* Background Soft Glow */}
      {isActive && opacity >= 0.8 && (
        <path
          d={pathD}
          fill="none"
          stroke={speakerColor}
          strokeWidth={4}
          strokeOpacity={0.15}
          strokeLinecap="round"
        />
      )}

      {/* Main Trajectory Path */}
      <path
        d={pathD}
        fill="none"
        stroke={speakerColor}
        strokeWidth={1.5}
        strokeDasharray={strokeDasharray}
        strokeLinecap={strokeLinecap}
      />

      {/* Stance Indicator Glyph at Arc Midpoint (Ensures No Color-Only Meaning) */}
      <g transform={`translate(${midX}, ${midY})`}>
        <circle r={7} fill="var(--bg-secondary)" stroke="var(--border-subtle)" strokeWidth={1} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fill={speakerColor}
          className="font-mono font-bold"
        >
          {markerSymbol}
        </text>
      </g>
    </g>
  );
};

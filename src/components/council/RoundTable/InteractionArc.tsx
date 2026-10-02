/**
 * Origin: The Council Round Table v3 / v4 (Section 6 & RT4 §3)
 * SVG dialogue arc connecting speaker to addressed peer with stance encoding:
 * - Directed arrowhead marker pointing to recipient
 * - Animated traveling pulse particle along the bezier arc
 * - Stance glyph indicator at arc midpoint
 * - Fading trail support (1.0 -> 0.6 -> 0.3)
 */

"use client";

import React, { useId } from "react";
import { computeInteractionArc } from "@/lib/council/geometry";
import { getStanceConfig } from "@/lib/ui/choreography";

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
  const uniqueId = useId().replace(/[:]/g, "");

  // Guard against self-addressed stances (R5)
  if (source.x === target.x && source.y === target.y) {
    return null;
  }

  const pathD = computeInteractionArc(source, target, center, { curvature: 0.52 });
  const stanceConfig = getStanceConfig(stance);

  // Midpoint approximation for stance glyph
  const midX = Math.round((source.x + target.x) / 2 + (center.x - (source.x + target.x) / 2) * 0.45);
  const midY = Math.round((source.y + target.y) / 2 + (center.y - (source.y + target.y) / 2) * 0.45);

  const markerId = `arrowhead-${stance}-${uniqueId}`;

  return (
    <g
      className="interaction-arc pointer-events-none transition-opacity duration-300 select-none"
      opacity={opacity}
      aria-hidden="true"
    >
      <defs>
        {/* Directed Arrowhead Marker (RT4 §3) */}
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill={speakerColor} opacity={opacity} />
        </marker>
      </defs>

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

      {/* Main Trajectory Path with Directed Arrowhead */}
      <path
        d={pathD}
        fill="none"
        stroke={speakerColor}
        strokeWidth={1.5}
        strokeDasharray={stanceConfig.dashArray}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
      />

      {/* Animated Traveling Pulse Particle (RT4 §3) */}
      {isActive && opacity >= 0.8 && (
        <circle r={2.5} fill={speakerColor} opacity={0.9}>
          <animateMotion
            path={pathD}
            dur={stanceConfig.particleSpeed}
            repeatCount="indefinite"
          />
        </circle>
      )}

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
          {stanceConfig.symbol}
        </text>
      </g>
    </g>
  );
};

'use client';

import React from 'react';
import { computeInteractionArc } from '@/lib/council/geometry';

export type InteractionStance = 'AGREE' | 'CHALLENGE' | 'CONCEDE' | 'NEUTRAL';

export interface InteractionArcProps {
  source: { x: number; y: number };
  target: { x: number; y: number };
  center: { x: number; y: number };
  stance?: InteractionStance;
  speakerColor?: string;
  isActive?: boolean;
}

export const InteractionArc: React.FC<InteractionArcProps> = ({
  source,
  target,
  center,
  stance = 'AGREE',
  speakerColor,
  isActive = true,
}) => {
  const pathD = computeInteractionArc(source, target, center, { curvature: 0.42 });

  // Map stance to stroke style & color
  let strokeColor = speakerColor || '#6366F1';
  let strokeDasharray = 'none';
  let strokeWidth = isActive ? 2.5 : 1.5;

  switch (stance) {
    case 'CHALLENGE':
      strokeColor = '#EF4444'; // Rose / Red
      strokeDasharray = '7 5';
      break;
    case 'CONCEDE':
      strokeColor = '#F59E0B'; // Amber
      strokeDasharray = '3 4';
      break;
    case 'AGREE':
      strokeColor = '#10B981'; // Emerald
      strokeDasharray = 'none';
      break;
    case 'NEUTRAL':
    default:
      strokeColor = speakerColor || '#818CF8';
      strokeDasharray = '4 4';
      break;
  }

  return (
    <g className="interaction-arc pointer-events-none transition-opacity duration-300">
      {/* Background glow path */}
      {isActive && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 3}
          strokeOpacity={0.2}
          strokeLinecap="round"
          className="blur-[2px]"
        />
      )}

      {/* Main interaction arc path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        strokeOpacity={isActive ? 0.9 : 0.4}
        className={isActive ? 'animate-pulse' : ''}
      />

      {/* Origin indicator dot */}
      <circle
        cx={source.x}
        cy={source.y}
        r={3}
        fill={strokeColor}
        opacity={0.8}
      />

      {/* Destination indicator dot */}
      <circle
        cx={target.x}
        cy={target.y}
        r={3}
        fill={strokeColor}
        opacity={0.8}
      />
    </g>
  );
};

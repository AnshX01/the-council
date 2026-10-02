/**
 * Origin: The Council Round Table v3 (Section 6)
 * Docked Atlas-style scrubber pill: play/pause, prev/next, speed (1x/2x/4x), step counter.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReplayScrubberProps {
  totalSteps: number;
  currentStep: number;
  onStepChange: (step: number) => void;
  isPlaying?: boolean;
  onPlayToggle?: (playing: boolean) => void;
  className?: string;
}

export const ReplayScrubber: React.FC<ReplayScrubberProps> = ({
  totalSteps,
  currentStep,
  onStepChange,
  isPlaying: externalIsPlaying,
  onPlayToggle,
  className = "",
}) => {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = useCallback(
    (val: boolean) => {
      setInternalIsPlaying(val);
      onPlayToggle?.(val);
    },
    [onPlayToggle]
  );

  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.round(1000 / speed);
    const timer = setInterval(() => {
      onStepChange(currentStep < totalSteps - 1 ? currentStep + 1 : 0);
      if (currentStep >= totalSteps - 1) {
        setIsPlaying(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep, totalSteps, speed, onStepChange, setIsPlaying]);

  const toggleSpeed = () => {
    if (speed === 1) setSpeed(2);
    else if (speed === 2) setSpeed(4);
    else setSpeed(1);
  };

  if (totalSteps <= 1) return null;

  return (
    <div
      role="region"
      aria-label="Deliberation replay controls"
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs select-none",
        className
      )}
    >
      {/* Rewind */}
      <button
        type="button"
        onClick={() => {
          setIsPlaying(false);
          onStepChange(0);
        }}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        title="Rewind to start"
        aria-label="Rewind to start"
      >
        <RotateCcw size={13} />
      </button>

      {/* Prev */}
      <button
        type="button"
        onClick={() => {
          setIsPlaying(false);
          onStepChange(Math.max(0, currentStep - 1));
        }}
        disabled={currentStep <= 0}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
        title="Previous event"
        aria-label="Previous event"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] flex items-center justify-center transition-transform active:scale-95"
        title={isPlaying ? "Pause" : "Play"}
        aria-label={isPlaying ? "Pause replay" : "Play replay"}
      >
        {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Next */}
      <button
        type="button"
        onClick={() => {
          setIsPlaying(false);
          onStepChange(Math.min(totalSteps - 1, currentStep + 1));
        }}
        disabled={currentStep >= totalSteps - 1}
        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
        title="Next event"
        aria-label="Next event"
      >
        <ChevronRight size={14} />
      </button>

      {/* Range slider */}
      <input
        type="range"
        min={0}
        max={totalSteps - 1}
        value={currentStep}
        onChange={(e) => {
          setIsPlaying(false);
          onStepChange(Number(e.target.value));
        }}
        className="w-24 sm:w-36 h-1 bg-[var(--bg-tertiary)] rounded appearance-none cursor-pointer accent-[var(--accent)]"
        aria-label="Replay timeline scrubber"
      />

      {/* Counter */}
      <span className="font-mono text-[11px] text-[var(--text-muted)] min-w-[48px] text-right">
        {currentStep + 1}/{totalSteps}
      </span>

      {/* Speed */}
      <button
        type="button"
        onClick={toggleSpeed}
        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        title="Playback speed"
        aria-label={`Playback speed ${speed}x`}
      >
        {speed}x
      </button>
    </div>
  );
};

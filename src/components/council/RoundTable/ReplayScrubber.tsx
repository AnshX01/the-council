'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FastForward,
} from 'lucide-react';

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
  className = '',
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

    const intervalMs = Math.round(1200 / speed);
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
      className={`glass-panel-subtle p-3 rounded-xl flex items-center gap-3 select-none ${className}`}
      role="region"
      aria-label="Deliberation replay controls"
    >
      {/* Play / Pause */}
      <button
        type="button"
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      {/* Step Back */}
      <button
        type="button"
        disabled={currentStep <= 0}
        onClick={() => onStepChange(Math.max(0, currentStep - 1))}
        aria-label="Previous step"
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Timeline Slider */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={currentStep}
          onChange={(e) => onStepChange(parseInt(e.target.value, 10))}
          aria-label="Deliberation timeline scrub position"
          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none"
        />
        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* Step Forward */}
      <button
        type="button"
        disabled={currentStep >= totalSteps - 1}
        onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
        aria-label="Next step"
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Speed Multiplier Button */}
      <button
        type="button"
        onClick={toggleSpeed}
        aria-label={`Playback speed: ${speed}x`}
        className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 transition-colors"
      >
        {speed}x
      </button>

      {/* Reset to Start */}
      <button
        type="button"
        onClick={() => onStepChange(0)}
        aria-label="Rewind to start"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

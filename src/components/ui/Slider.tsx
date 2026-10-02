/**
 * Origin: Atlas Labelled Slider
 * Minimal range slider displaying current numeric value.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  unit?: string;
  description?: string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit = "",
  description,
  className,
}: SliderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {label}
          </span>
        )}
        <span className="text-xs font-mono font-medium text-[var(--text-primary)]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
      />
      {description && (
        <span className="text-[11px] text-[var(--text-muted)]">{description}</span>
      )}
    </div>
  );
}

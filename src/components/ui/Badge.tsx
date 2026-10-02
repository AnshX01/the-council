/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/Badge.tsx)
 * 11px tonal pill badges with status dot support, size variants, and neutral/accent fallbacks.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "urgent"
  | "high"
  | "medium"
  | "low"
  | "outline"
  | "neutral"
  | "accent";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "xs" | "sm" | "md";
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  neutral: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  accent:  "bg-[var(--accent)] text-[var(--bg-primary)] font-medium",
  urgent:  "bg-[var(--bg-tertiary)] text-[var(--status-urgent)] font-semibold",
  high:    "bg-[var(--bg-tertiary)] text-[var(--status-high)] font-medium",
  medium:  "bg-[var(--bg-tertiary)] text-[var(--status-medium)] font-medium",
  low:     "bg-[var(--bg-tertiary)] text-[var(--status-low)] font-medium",
  outline: "bg-transparent text-[var(--text-muted)] border border-[var(--border-subtle)]",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[var(--text-muted)]",
  neutral: "bg-[var(--text-muted)]",
  accent:  "bg-[var(--bg-primary)]",
  urgent:  "bg-[var(--status-urgent)]",
  high:    "bg-[var(--status-high)]",
  medium:  "bg-[var(--status-medium)]",
  low:     "bg-[var(--status-low)]",
  outline: "bg-[var(--text-muted)]",
};

const sizeStyles: Record<"xs" | "sm" | "md", string> = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "rounded-full font-medium tracking-wide",
        "select-none whitespace-nowrap",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

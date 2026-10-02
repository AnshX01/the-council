/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/Skeleton.tsx)
 * Shimmer skeleton blocks for zero-layout-shift loading states.
 */

"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  circle?: boolean;
  style?: React.CSSProperties;
}

export function Skeleton({ className, circle, style }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn(
        "skeleton",
        circle ? "rounded-full" : "rounded-lg",
        className
      )}
      style={style}
    />
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading content...">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? "60%" : "100%" } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

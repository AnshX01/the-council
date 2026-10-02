/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/Spinner.tsx)
 * Minimal circular loading indicator.
 */

import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-3 h-3 border-[1.5px]",
  sm: "w-4 h-4 border-2",
  md: "w-5 h-5 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn(
        "rounded-full border-[var(--border-default)] border-t-[var(--text-primary)] animate-spin",
        sizeMap[size],
        className
      )}
    />
  );
}

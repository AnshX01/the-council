/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/AgentDesignSystemShell.tsx)
 * Renamed to Surface. Flat, borderless glass container with subtle blur.
 */

"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

export interface SurfaceProps extends HTMLMotionProps<"div"> {
  className?: string;
  children: React.ReactNode;
  contentClassName?: string;
}

export function Surface({ className, children, contentClassName, ...props }: SurfaceProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-[var(--bg-secondary)] relative overflow-hidden transition-colors duration-200",
        className
      )}
      {...props}
    >
      <div className={cn("relative z-10 flex flex-col w-full h-full", contentClassName)}>
        {children}
      </div>
    </motion.div>
  );
}

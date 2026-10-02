/**
 * Origin: Atlas Radix Tooltip Primitive
 * Accessible tooltip with Atlas glass tokens.
 */

"use client";

import React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={150}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={sideOffset}
            className={cn(
              "z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium",
              "bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)]",
              "animate-fade-in select-none",
              className
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-[var(--bg-secondary)]" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

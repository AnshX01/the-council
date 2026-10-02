/**
 * Origin: Atlas Radix Dialog Primitive
 * Accessible modal dialog with Atlas backdrop blur and spring animation.
 */

"use client";

import React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  maxWidth = "max-w-lg",
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <RadixDialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "w-full p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]",
            "animate-spring-scale focus:outline-none",
            maxWidth,
            className
          )}
        >
          <div className="flex items-center justify-between mb-4">
            {title && (
              <RadixDialog.Title className="text-base font-semibold text-[var(--text-primary)]">
                {title}
              </RadixDialog.Title>
            )}
            <RadixDialog.Close asChild>
              <button
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </RadixDialog.Close>
          </div>
          {description && (
            <RadixDialog.Description className="text-xs text-[var(--text-secondary)] mb-4">
              {description}
            </RadixDialog.Description>
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/**
 * Origin: AnshX01/Atlas (frontend/src/components/ui/Toast.tsx)
 * Toast system using react-hot-toast at bottom-center with Atlas spring physics.
 */

"use client";

import React from "react";
import { Toaster, toast as hotToast } from "react-hot-toast";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const toast = {
  success: (message: string) => {
    return hotToast.custom((t) => (
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
          "bg-[var(--bg-secondary)] border border-[var(--border-subtle)]",
          "text-sm text-[var(--text-primary)]",
          t.visible ? "animate-spring-slide-up" : "opacity-0"
        )}
      >
        <CheckCircle2 size={16} className="text-[var(--status-low)] flex-shrink-0" />
        <span className="font-medium">{message}</span>
        <button
          onClick={() => hotToast.dismiss(t.id)}
          className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    ));
  },
  error: (message: string) => {
    return hotToast.custom((t) => (
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
          "bg-[var(--bg-secondary)] border border-[var(--border-subtle)]",
          "text-sm text-[var(--text-primary)]",
          t.visible ? "animate-spring-slide-up" : "opacity-0"
        )}
      >
        <AlertCircle size={16} className="text-[var(--status-urgent)] flex-shrink-0" />
        <span className="font-medium">{message}</span>
        <button
          onClick={() => hotToast.dismiss(t.id)}
          className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    ));
  },
  info: (message: string) => {
    return hotToast.custom((t) => (
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl",
          "bg-[var(--bg-secondary)] border border-[var(--border-subtle)]",
          "text-sm text-[var(--text-primary)]",
          t.visible ? "animate-spring-slide-up" : "opacity-0"
        )}
      >
        <span className="font-medium">{message}</span>
        <button
          onClick={() => hotToast.dismiss(t.id)}
          className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    ));
  },
};

export function ToastProvider({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3500,
        }}
      />
    </>
  );
}

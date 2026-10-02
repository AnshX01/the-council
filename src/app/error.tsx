"use client";

/**
 * Origin: AnshX01/Atlas (frontend/src/app/error.tsx)
 * Next.js error boundary for The Council.
 */

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Council application error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--status-urgent)]/10 text-[var(--status-urgent)] flex items-center justify-center">
          <AlertCircle size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Chamber Encountered an Error
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            An unexpected error occurred during execution. You can attempt to retry the current state or return to the main deliberation chamber.
          </p>
          {error.message && (
            <p className="p-3 rounded-xl bg-[var(--bg-secondary)] font-mono text-[11px] text-[var(--text-muted)] text-left overflow-x-auto">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="sm" onClick={() => reset()}>
            <RefreshCw size={13} className="mr-1.5" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="secondary" size="sm">
              <Home size={13} className="mr-1.5" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Origin: AnshX01/Atlas (frontend/src/app)
 * Next.js 404 handler for The Council.
 */

import React from "react";
import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-muted)] flex items-center justify-center">
          <Compass size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
            404 &bull; Missing Record
          </span>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Deliberation Not Found
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The requested chamber session, dialetic trace, or page does not exist or has been permanently pruned from SQLite storage.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link href="/">
            <Button variant="primary" size="sm">
              <Home size={13} className="mr-1.5" />
              Chamber Overview
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="secondary" size="sm">
              View History
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

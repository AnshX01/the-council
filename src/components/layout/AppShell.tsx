/**
 * Origin: AnshX01/Atlas (frontend/src/components/layout/AppShell.tsx)
 * Desktop grid shell (220px sidebar + 1fr main) with ambient orbs and PageTransition.
 */

"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { PageTransition } from "@/components/layout/PageTransition";
import { Menu, X, Sun, Moon } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Command Palette singleton */}
      <CommandPalette />

      {/* Desktop Sidebar (>= 1024px) */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Slide-over Sidebar (< 1024px) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-[240px] bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col h-full">
            <div className="p-3 flex justify-end">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Mobile Header Bar (< 1024px) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <span className="font-bold text-sm text-[var(--text-primary)]">
              The Council
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.contains("dark");
                if (isDark) {
                  document.documentElement.classList.remove("dark");
                } else {
                  document.documentElement.classList.add("dark");
                }
              }}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <Sun size={15} className="hidden dark:block" />
              <Moon size={15} className="block dark:hidden" />
            </button>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
              LOCAL
            </span>
          </div>
        </header>

        {/* Ambient Subtle Monochrome Radial Orbs */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-30 dark:opacity-20 z-0"
          aria-hidden="true"
        >
          <div className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06)_0%,transparent_70%)] blur-2xl" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)] blur-2xl" />
        </div>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto relative z-10 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { ApiKeyModal } from './ApiKeyModal';
import { Shield, Sparkles, AlertTriangle, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export function Navbar() {
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [engineLabel, setEngineLabel] = useState('Checking Engine...');

  useEffect(() => {
    function evaluateKeyStatus() {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('the_council_gemini_api_key') : null;
      fetch('/api/health')
        .then((r) => r.json())
        .then((data) => {
          if (data.hasServerApiKey || (storedKey && storedKey.length > 5)) {
            setHasKey(true);
            setEngineLabel(`Gemini Active (${data.serverModel || '2.5-flash'})`);
          } else {
            setHasKey(false);
            setEngineLabel('Simulation Mode (Set Key)');
          }
        })
        .catch(() => {
          if (storedKey && storedKey.length > 5) {
            setHasKey(true);
            setEngineLabel('Gemini Active (Custom)');
          } else {
            setHasKey(false);
            setEngineLabel('Simulation Mode');
          }
        });
    }

    evaluateKeyStatus();
  }, [isKeyModalOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-header transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 group transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-[12px] p-1 -ml-1"
          >
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/25 border border-white/20">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-tight text-gray-950 dark:text-gray-50 block leading-tight">
                The Council
              </span>
              <span className="text-[10px] tracking-widest uppercase text-gray-500 dark:text-gray-400 font-sans font-medium">
                Multi-Agent Deliberation
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="text-xs font-medium px-3 py-1.5 rounded-[10px] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Chamber
            </Link>
            <Link
              href="/history"
              className="text-xs font-medium px-3 py-1.5 rounded-[10px] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              History
            </Link>
            <Link
              href="/settings"
              className="text-xs font-medium px-3 py-1.5 rounded-[10px] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/diagnostics"
              className="text-xs font-medium px-3 py-1.5 rounded-[10px] text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Diagnostics
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Command Palette trigger button */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true }));
              }}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 transition-colors"
              title="Open Command Palette (Ctrl+K / Cmd+K)"
            >
              <span>Search</span>
              <kbd className="px-1 text-[10px] font-mono bg-white dark:bg-zinc-800 rounded shadow-xs">
                ⌘K
              </kbd>
            </button>

            {/* Engine / API Key Status Trigger */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full transition-transform active:scale-95"
              title="Click to configure Google Gemini API Key and Model"
            >
              <Badge
                variant={hasKey ? 'success' : 'warning'}
                size="sm"
                icon={hasKey ? <Sparkles className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                className="cursor-pointer hover:opacity-90"
              >
                {engineLabel}
              </Badge>
            </button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSave={() => {
          setIsKeyModalOpen(false);
        }}
      />
    </>
  );
}

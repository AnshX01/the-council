'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { ApiKeyModal } from './ApiKeyModal';
import { Shield, Sparkles, Key, CheckCircle, AlertTriangle } from 'lucide-react';

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
      <header className="sticky top-0 z-40 w-full border-b border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-smooth">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-smooth focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-smooth">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-wide text-gray-900 dark:text-gray-100 block leading-tight">
                The Council
              </span>
              <span className="text-[10px] tracking-widest uppercase text-gray-500 dark:text-gray-400 font-sans font-medium">
                Multi-Agent Deliberation
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-smooth hidden sm:inline-block"
            >
              New Deliberation
            </Link>

            {/* Engine / API Key Status Trigger */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-smooth ${
                hasKey
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60'
                  : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100/60'
              }`}
              title="Click to configure Google Gemini API Key and Model"
            >
              {hasKey ? (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>{engineLabel}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>{engineLabel}</span>
                </>
              )}
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

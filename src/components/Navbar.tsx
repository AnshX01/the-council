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

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[10px] text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-gray-400" />
              <span>New Deliberation</span>
            </Link>

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

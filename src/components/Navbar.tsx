import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { Shield, Sparkles } from 'lucide-react';

export function Navbar() {
  return (
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

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-smooth hidden sm:inline-block"
          >
            New Deliberation
          </Link>
          <a
            href="https://ai.google.dev"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 transition-smooth"
          >
            <Sparkles className="w-3 h-3" />
            <span>Gemini Powered</span>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

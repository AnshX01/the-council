'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read saved preference or system preference
    const saved = localStorage.getItem('council_theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      // Default to dark mode (Monterey dark chamber) unless explicitly preferring light
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      const initial = prefersLight ? 'light' : 'dark';
      setTheme(initial);
      document.documentElement.classList.toggle('dark', initial === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('council_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-[10px] border border-gray-200/60 dark:border-white/10 bg-white/40 dark:bg-white/5" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-[10px] border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.08] hover:bg-white dark:hover:bg-white/[0.14] text-gray-700 dark:text-gray-200 backdrop-blur-md shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  PlusCircle,
  History,
  Settings,
  Activity,
  Sun,
  Moon,
  Shield,
  Palette,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
  onSelect: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('the_council_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('the_council_theme', 'dark');
    }
  }, []);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'new-session',
        label: 'Start New Deliberation',
        category: 'Actions',
        icon: <PlusCircle className="w-4 h-4 text-indigo-500" />,
        shortcut: 'N',
        onSelect: () => router.push('/'),
      },
      {
        id: 'history',
        label: 'Deliberation Archive & History',
        category: 'Navigation',
        icon: <History className="w-4 h-4 text-sky-500" />,
        shortcut: 'H',
        onSelect: () => router.push('/history'),
      },
      {
        id: 'settings',
        label: 'Settings & API Keys',
        category: 'Navigation',
        icon: <Settings className="w-4 h-4 text-amber-500" />,
        shortcut: 'S',
        onSelect: () => router.push('/settings'),
      },
      {
        id: 'diagnostics',
        label: 'System Diagnostics & Health Probes',
        category: 'System',
        icon: <Activity className="w-4 h-4 text-emerald-500" />,
        shortcut: 'D',
        onSelect: () => router.push('/diagnostics'),
      },
      {
        id: 'dev-ui',
        label: 'Design System Living Catalog (/dev/ui)',
        category: 'Development',
        icon: <Palette className="w-4 h-4 text-purple-500" />,
        shortcut: 'U',
        onSelect: () => router.push('/dev/ui'),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Dark / Light Theme',
        category: 'Preferences',
        icon: <Moon className="w-4 h-4 text-zinc-400" />,
        shortcut: 'T',
        onSelect: toggleTheme,
      },
      {
        id: 'test-key',
        label: 'Test Gemini API Key Connection',
        category: 'System',
        icon: <KeyRound className="w-4 h-4 text-rose-500" />,
        onSelect: () => router.push('/settings?action=test-key'),
      },
    ],
    [router, toggleTheme]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4 animate-fade-in"
      onClick={() => setIsOpen(false)}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg glass-panel-elevated shadow-2xl rounded-2xl overflow-hidden border border-white/20 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 gap-3 border-b border-black/5 dark:border-white/10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to page... (Esc to close)"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-black/5 dark:bg-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, i) => (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.onSelect();
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  selectedIndex === i
                    ? 'bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{cmd.icon}</span>
                  <span className="text-xs sm:text-sm font-medium">{cmd.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {cmd.category}
                  </span>
                  {cmd.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-black/5 dark:bg-white/10 rounded">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
              No matching commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

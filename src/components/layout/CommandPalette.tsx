/**
 * Origin: AnshX01/Atlas (frontend/src/components/layout/CommandPalette.tsx)
 * Global Fuse.js fuzzy command palette with session jump and keyboard shortcuts.
 */

"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Plus,
  History,
  Settings,
  Activity,
  Sun,
  Moon,
  Compass,
  List,
  Sparkles,
  RotateCcw,
  FileText,
  Copy,
} from "lucide-react";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

interface CommandItem {
  id: string;
  label: string;
  category: "Actions" | "Navigation" | "Recent Deliberations" | "Chamber";
  icon: React.ReactNode;
  onSelect: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string; title: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Load recent sessions for quick jumping
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/v1/sessions?limit=8")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.sessions || json?.sessions) {
          setRecentSessions(json.data?.sessions || json.sessions);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.info(`Theme set to ${next} mode`);
  }, []);

  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: "new-deliberation",
        label: "Start New Deliberation",
        category: "Actions",
        icon: <Plus size={16} />,
        shortcut: "N",
        onSelect: () => router.push("/"),
      },
      {
        id: "nav-history",
        label: "History (Deliberation Archive)",
        category: "Navigation",
        icon: <History size={16} />,
        shortcut: "G H",
        onSelect: () => router.push("/history"),
      },
      {
        id: "nav-settings",
        label: "Settings & API Keys",
        category: "Navigation",
        icon: <Settings size={16} />,
        shortcut: "G S",
        onSelect: () => router.push("/settings"),
      },
      {
        id: "nav-diagnostics",
        label: "Diagnostics & System Health",
        category: "Navigation",
        icon: <Activity size={16} />,
        shortcut: "G D",
        onSelect: () => router.push("/diagnostics"),
      },
      {
        id: "toggle-theme",
        label: "Toggle Dark / Light Theme",
        category: "Actions",
        icon: <Sun size={16} />,
        shortcut: "T",
        onSelect: toggleTheme,
      },
      {
        id: "toggle-view",
        label: "Toggle Round Table / List View",
        category: "Chamber",
        icon: <List size={16} />,
        onSelect: () => {
          window.dispatchEvent(new CustomEvent("council:toggle-table-view"));
          toast.info("Toggled chamber view mode");
        },
      },
    ];

    // Add session contextual actions if viewing a deliberation
    const match = pathname.match(/\/(?:c|session)\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const sessionId = match[1];
      list.push(
        {
          id: "session-rerun",
          label: "Rerun Deliberation",
          category: "Chamber",
          icon: <RotateCcw size={16} />,
          onSelect: () => {
            fetch(`/api/v1/sessions/${sessionId}/rerun`, { method: "POST" })
              .then((res) => res.json())
              .then((json) => {
                const newId = json.data?.session?.id || json.session?.id;
                if (newId) router.push(`/c/${newId}`);
              });
          },
        },
        {
          id: "session-export-md",
          label: "Export Deliberation as Markdown",
          category: "Chamber",
          icon: <FileText size={16} />,
          onSelect: () => {
            window.open(`/api/v1/sessions/${sessionId}/export?format=md`, "_blank");
          },
        },
        {
          id: "session-copy-summary",
          label: "Copy Resolution Summary",
          category: "Chamber",
          icon: <Copy size={16} />,
          onSelect: () => {
            window.dispatchEvent(new CustomEvent("council:copy-summary"));
          },
        }
      );
    }

    // Add recent session shortcuts
    recentSessions.forEach((s) => {
      list.push({
        id: `recent-${s.id}`,
        label: s.title || `Deliberation ${s.id.slice(0, 8)}`,
        category: "Recent Deliberations",
        icon: <Compass size={16} />,
        onSelect: () => router.push(`/c/${s.id}`),
      });
    });

    return list;
  }, [router, pathname, recentSessions, toggleTheme]);

  // Fuse.js index for fuzzy searching
  const fuse = useMemo(
    () =>
      new Fuse(commands, {
        keys: ["label", "category", "id"],
        threshold: 0.45,
        ignoreLocation: true,
      }),
    [commands]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    return fuse.search(query).map((res) => res.item);
  }, [fuse, query, commands]);

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette: Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // If palette is open:
      if (isOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
          return;
        }
        if (e.key === "Enter" && filtered[selectedIndex]) {
          e.preventDefault();
          filtered[selectedIndex].onSelect();
          setIsOpen(false);
          return;
        }
        return;
      }

      // Single key global shortcuts when no input is focused:
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "N" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/");
      } else if (e.key === "T" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const handleCustomOpen = () => setIsOpen(true);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen, filtered, selectedIndex, router, toggleTheme]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden animate-spring-scale"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
          <Search size={16} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            autoFocus
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[selectedIndex]) {
                e.preventDefault();
                filtered[selectedIndex].onSelect();
                setIsOpen(false);
              }
            }}
            placeholder="Type a command or search deliberations..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            aria-label="Command palette input"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5 flex flex-col gap-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No matching commands or deliberations found
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.onSelect();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left",
                    isSelected
                      ? "bg-[var(--accent)]/10 text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-[var(--text-muted)] flex-shrink-0">
                      {cmd.icon}
                    </span>
                    <span className="truncate font-medium">{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)] flex-shrink-0">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Origin: AnshX01/Atlas (frontend/src/components/layout/Sidebar.tsx)
 * 220px desktop sidebar with brand wordmark, workspace navigation,
 * engine status indicators, independent deliberations scroll, and spend meter.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  History,
  Activity,
  Settings,
  Plus,
  Trash2,
  Sun,
  Moon,
  Search,
  Cpu,
  Database,
  Radio,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useEngineStatus, useSettings } from "@/lib/ui/hooks";
import { toast } from "@/components/ui/Toast";

interface RecentSession {
  id: string;
  title: string;
  status: string;
  created_at?: string;
  createdAt?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const engineStatus = useEngineStatus();
  const { settings, updateSettings } = useSettings();

  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);

  // Fetch recent sessions
  const fetchRecentSessions = async () => {
    try {
      const res = await fetch("/api/v1/sessions?limit=10");
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.sessions || json.sessions || [];
        setRecentSessions(list);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchRecentSessions();
    const interval = setInterval(fetchRecentSessions, 15_000);
    return () => clearInterval(interval);
  }, [pathname]);

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRecentSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Deliberation deleted");
        if (pathname.includes(id)) {
          router.push("/");
        }
      } else {
        toast.error("Failed to delete deliberation");
      }
    } catch {
      toast.error("Network error deleting deliberation");
    }
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    updateSettings({ theme: next });
    toast.info(`Theme set to ${next} mode`);
  };

  const navItems = [
    { label: "Chamber", href: "/", icon: <Compass size={16} /> },
    { label: "History", href: "/history", icon: <History size={16} /> },
    { label: "Diagnostics", href: "/diagnostics", icon: <Activity size={16} /> },
  ];

  return (
    <aside className="w-[220px] h-screen bg-[var(--bg-primary)] border-r border-[var(--border-subtle)] flex flex-col select-none flex-shrink-0 z-30">
      {/* Brand & Mode */}
      <div className="p-4 pb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-xs">
            C
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
            The Council
          </span>
        </Link>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-medium">
          LOCAL
        </span>
      </div>

      {/* Search trigger (Cmd+K) */}
      <div className="px-3 mb-2">
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-command-palette"));
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs text-[var(--text-muted)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search size={13} />
            Search or jump...
          </span>
          <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Main Navigation */}
      <div className="px-2 py-1">
        <div className="px-2 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Workspace
          </span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname.startsWith("/c/") || pathname.startsWith("/session/")
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors",
                  isActive
                    ? "text-[var(--text-primary)] bg-[var(--accent)]/10"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 w-[2px] h-4 bg-[var(--accent)] rounded-r-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Engine Status Rows (Atlas Connectors analog) */}
      <div className="px-2 py-2 border-t border-[var(--border-subtle)]">
        <div className="px-2 mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Engine
          </span>
        </div>
        <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
          <Link
            href="/settings"
            className="flex items-center justify-between px-2.5 py-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
          >
            <span className="flex items-center gap-2 text-[11px] truncate">
              <Cpu size={13} className="text-[var(--text-muted)]" />
              <span className="truncate">{engineStatus.model}</span>
            </span>
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                engineStatus.keyConfigured
                  ? "bg-[var(--status-low)]"
                  : "bg-[var(--status-medium)]"
              )}
            />
          </Link>
          <Link
            href="/diagnostics"
            className="flex items-center justify-between px-2.5 py-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="flex items-center gap-2 text-[11px]">
              <Radio size={13} className="text-[var(--text-muted)]" />
              <span>Durable Runner</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-low)]" />
          </Link>
          <Link
            href="/diagnostics"
            className="flex items-center justify-between px-2.5 py-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="flex items-center gap-2 text-[11px]">
              <Database size={13} className="text-[var(--text-muted)]" />
              <span>SQLite WAL</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-low)]" />
          </Link>
        </div>
      </div>

      {/* Deliberations List (Atlas Conversations analog) */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-[var(--border-subtle)] px-2 pt-2">
        <div className="px-2 mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Deliberations
          </span>
          <Link
            href="/"
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors"
            title="New Deliberation"
            aria-label="New Deliberation"
          >
            <Plus size={14} />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 pr-1">
          {recentSessions.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-[11px] text-[var(--text-muted)]">No recent runs</p>
            </div>
          ) : (
            recentSessions.map((s) => {
              const isRunning = s.status === "RUNNING";
              const rawDate = s.created_at || s.createdAt;
              const timeAgo = rawDate
                ? formatDistanceToNow(new Date(rawDate), { addSuffix: false })
                : "";

              return (
                <Link
                  key={s.id}
                  href={`/c/${s.id}`}
                  className="group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {isRunning && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-medium)] animate-pulse flex-shrink-0" />
                    )}
                    <span className="truncate text-[11px]">{s.title || "Untitled Dilemma"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-[var(--text-muted)] group-hover:hidden">
                      {timeAgo}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="hidden group-hover:inline-flex text-[var(--text-muted)] hover:text-[var(--status-urgent)] transition-colors"
                      title="Delete deliberation"
                      aria-label="Delete deliberation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom controls: Spend meter, Settings, Theme */}
      <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
        <div className="px-1 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
          <span>Spend Cap</span>
          <span className="font-mono text-[var(--text-secondary)]">
            $0.00 / ${settings.monthlySpendCapUSD}
          </span>
        </div>
        <div className="w-full h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--accent)] rounded-full w-[2%]" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <Link
            href="/settings"
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <Settings size={14} />
            <span>Settings</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <Sun size={14} className="hidden dark:block" />
            <Moon size={14} className="block dark:hidden" />
          </button>
        </div>
      </div>
    </aside>
  );
}

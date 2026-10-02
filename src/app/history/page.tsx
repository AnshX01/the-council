/**
 * Origin: The Council — History Page (Section 5.4)
 * Atlas-grade list view: single-line rows, status filters, date groupings,
 * FTS search, hover-reveal actions, and session comparison.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Check,
  Scale,
  Trash2,
  RotateCcw,
  Plus,
  Compass,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface SessionRow {
  id: string;
  title: string;
  query: string;
  status: string;
  verdict_type?: string;
  verdictType?: string;
  created_at?: string;
  createdAt?: string;
  total_llm_calls?: number;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/v1/sessions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const list = json.data?.sessions || json.sessions || [];
        setSessions(list);
      }
    } catch {
      toast.error("Failed to load deliberations");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Deliberation deleted");
      }
    } catch {
      toast.error("Failed to delete deliberation");
    }
  };

  const handleRerun = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/sessions/${id}/rerun`, { method: "POST" });
      const json = await res.json();
      const newId = json.data?.session?.id || json.session?.id;
      if (newId) {
        router.push(`/c/${newId}`);
      }
    } catch {
      toast.error("Failed to rerun deliberation");
    }
  };

  // Filtered sessions
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "completed") return s.status === "COMPLETED";
      if (statusFilter === "running") return s.status === "RUNNING";
      if (statusFilter === "failed") return s.status === "FAILED" || s.status === "CANCELLED";
      return true;
    });
  }, [sessions, statusFilter]);

  // Group by Today / Yesterday / Earlier
  const grouped = useMemo(() => {
    const today: SessionRow[] = [];
    const yesterday: SessionRow[] = [];
    const earlier: SessionRow[] = [];

    for (const s of filtered) {
      const raw = s.created_at || s.createdAt;
      const d = raw ? new Date(raw) : new Date();
      if (isToday(d)) today.push(s);
      else if (isYesterday(d)) yesterday.push(s);
      else earlier.push(s);
    }

    return { today, yesterday, earlier };
  }, [filtered]);

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "running", label: "Running" },
    { id: "failed", label: "Failed/Aborted" },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-16">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Deliberation Archive
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Search and inspect historical deliberations stored in local SQLite WAL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedForCompare.length === 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                toast.info(`Comparing sessions #${selectedForCompare[0].slice(0, 6)} & #${selectedForCompare[1].slice(0, 6)}`);
              }}
            >
              Compare (2)
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/")}
            leftIcon={<Plus size={14} />}
          >
            New Deliberation
          </Button>
        </div>
      </div>

      {/* Search Input & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search previous questions and queries (FTS5)..."
            className="w-full bg-transparent pl-8 pr-4 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            aria-label="Search deliberations"
          />
        </div>

        <Tabs tabs={statusTabs} activeTab={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <Compass size={32} className="text-[var(--text-muted)] mb-3" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            No deliberations recorded
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4">
            {searchQuery ? "No inquiries match your search filter." : "Start your first deliberation session with the Council."}
          </p>
          <Button variant="secondary" size="sm" onClick={() => router.push("/")}>
            Convene Council
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Today Group */}
          {grouped.today.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-1">
                Today
              </span>
              <div className="flex flex-col gap-1">
                {grouped.today.map((s) => (
                  <SessionListRow
                    key={s.id}
                    session={s}
                    onDelete={handleDelete}
                    onRerun={handleRerun}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Yesterday Group */}
          {grouped.yesterday.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-1">
                Yesterday
              </span>
              <div className="flex flex-col gap-1">
                {grouped.yesterday.map((s) => (
                  <SessionListRow
                    key={s.id}
                    session={s}
                    onDelete={handleDelete}
                    onRerun={handleRerun}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Earlier Group */}
          {grouped.earlier.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-1">
                Earlier
              </span>
              <div className="flex flex-col gap-1">
                {grouped.earlier.map((s) => (
                  <SessionListRow
                    key={s.id}
                    session={s}
                    onDelete={handleDelete}
                    onRerun={handleRerun}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionListRow({
  session,
  onDelete,
  onRerun,
}: {
  session: SessionRow;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onRerun: (e: React.MouseEvent, id: string) => void;
}) {
  const isUnanimous =
    session.verdict_type === "UNANIMOUS" || session.verdictType === "UNANIMOUS";
  const isRunning = session.status === "RUNNING";
  const rawDate = session.created_at || session.createdAt;
  const timeAgo = rawDate
    ? formatDistanceToNow(new Date(rawDate), { addSuffix: false })
    : "";

  return (
    <Link
      href={`/c/${session.id}`}
      className="group p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-between gap-4 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="w-2 h-2 rounded-full flex-shrink-0">
          {isRunning ? (
            <span className="block w-2 h-2 rounded-full bg-[var(--status-low)] animate-pulse" />
          ) : isUnanimous ? (
            <span className="block w-2 h-2 rounded-full bg-[var(--status-low)]" />
          ) : (
            <span className="block w-2 h-2 rounded-full bg-[var(--text-muted)]" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-lg">
            {session.title || session.query}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] truncate max-w-md">
            {session.query}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {timeAgo}
        </span>

        {/* Hover-reveal actions */}
        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={(e) => onRerun(e, session.id)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Rerun deliberation"
            aria-label="Rerun deliberation"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={(e) => onDelete(e, session.id)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-urgent)]"
            title="Delete deliberation"
            aria-label="Delete deliberation"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <span className="text-[11px] text-[var(--text-muted)] group-hover:hidden">
          →
        </span>
      </div>
    </Link>
  );
}

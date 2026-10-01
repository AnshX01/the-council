'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  History,
  CheckCircle2,
  Scale,
  Trash2,
  RotateCcw,
  Download,
  Filter,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface SessionItem {
  id: string;
  raw_query: string;
  status: string;
  current_phase: string;
  created_at: string;
  ended_at?: string;
  verdict_one_liner?: string;
  is_unanimous?: boolean;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/v1/sessions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data?.items || []);
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Failed to load history', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [query, statusFilter, toast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this deliberation from history?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast({ type: 'info', title: 'Deliberation Deleted', description: 'Session removed from archive.' });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Deletion Failed', description: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRerun = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/sessions/${id}/rerun`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push(`/c/${data.data.newSessionId}`);
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Rerun Failed', description: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-gray-50">
              Deliberation Archive & History
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Browse and inspect past multi-agent deliberations, consensus verdicts, and dissenting opinions.
          </p>
        </div>

        <Link href="/">
          <Button variant="primary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
            Convene New Session
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <GlassCard padded="sm" className="space-y-3 !rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/3 dark:bg-white/5 border border-black/5 dark:border-white/10">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search previous questions, dilemmas, or verdict texts..."
              className="flex-1 bg-transparent text-xs outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-mono">Status:</span>
            {['all', 'completed', 'running', 'aborted', 'failed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-gray-400 font-mono">
            {sessions.length} recorded
          </span>
        </div>
      </GlassCard>

      {/* Session Cards List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <p className="text-xs text-gray-400 font-mono">Querying archive database...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-20 text-center glass-panel-subtle rounded-2xl p-8 space-y-3">
          <History className="w-10 h-10 stroke-1 text-gray-400 mx-auto" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            No deliberations found
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {query
              ? `No deliberations matched "${query}". Try adjusting your keywords.`
              : 'The deliberation archive is currently empty. Convene your first council session.'}
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="primary" size="sm">
                Convene Deliberation
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <GlassCard
              key={s.id}
              onClick={() => router.push(`/c/${s.id}`)}
              interactive
              padded="sm"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer !rounded-2xl hover:border-indigo-500/40"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-gray-400">
                    #{s.id.slice(0, 10)}
                  </span>
                  <Badge
                    variant={
                      s.status === 'completed'
                        ? s.is_unanimous
                          ? 'success'
                          : 'neutral'
                        : s.status === 'running'
                        ? 'accent'
                        : 'warning'
                    }
                    size="xs"
                    icon={
                      s.status === 'completed' ? (
                        s.is_unanimous ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Scale className="w-3 h-3 text-slate-400" />
                        )
                      ) : undefined
                    }
                  >
                    {s.status === 'completed'
                      ? s.is_unanimous
                        ? 'Unanimous'
                        : 'Consensus Reached'
                      : s.status}
                  </Badge>

                  <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                  &ldquo;{s.raw_query}&rdquo;
                </h3>

                {s.verdict_one_liner && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                    {s.verdict_one_liner}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => handleRerun(s.id, e)}
                  leftIcon={<RotateCcw className="w-3 h-3" />}
                  title="Rerun session"
                >
                  Rerun
                </Button>

                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/api/v1/sessions/${s.id}/export?format=markdown`, '_blank');
                  }}
                  leftIcon={<Download className="w-3 h-3" />}
                  title="Export markdown"
                >
                  Export
                </Button>

                <button
                  type="button"
                  disabled={deletingId === s.id}
                  onClick={(e) => handleDelete(s.id, e)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Delete from archive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <ArrowRight className="w-4 h-4 text-gray-400 ml-1" />
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The Council — Shared Reactive Hooks
 * Origin: Unified client data layer for settings, engine health, and SSE deliberation streams.
 * Prevents split-brain state, eliminates localStorage API key leaks, and ensures resumable streaming.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeliberationSession } from '@/types/session';
import { CouncilSSEEvent } from '@/types/events';

// ── B3 & B2: useSettings Hook ─────────────────────────────────
export interface LocalSettings {
  defaultModel: string;
  fallbackModels: string[];
  maxCrossExamRounds: number;
  maxRatificationCycles: number;
  monthlySpendCapUSD: number;
  enableLAN: boolean;
  lanAccessPIN: string;
  theme: 'dark' | 'light' | 'system';
  enable3DTilt: boolean;
  enableReducedMotion: boolean;
  geminiKeyMasked?: string;
  geminiKeyConfigured?: boolean;
}

const DEFAULT_SETTINGS: LocalSettings = {
  defaultModel: 'gemini-2.5-flash',
  fallbackModels: ['gemini-1.5-flash'],
  maxCrossExamRounds: 3,
  maxRatificationCycles: 2,
  monthlySpendCapUSD: 10,
  enableLAN: false,
  lanAccessPIN: '',
  theme: 'dark',
  enable3DTilt: false,
  enableReducedMotion: false,
  geminiKeyConfigured: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/settings');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const raw = json.data?.settings || json.settings || {};
      setSettings((prev) => ({
        ...prev,
        ...raw,
      }));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<LocalSettings>) => {
      try {
        const res = await fetch('/api/v1/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }
        const json = await res.json();
        const updated = json.data?.settings || json.settings;
        setSettings((prev) => ({ ...prev, ...updated }));
        return { ok: true, settings: updated };
      } catch (err: any) {
        return { ok: false, error: err.message };
      }
    },
    []
  );

  const testKey = useCallback(async (apiKey?: string) => {
    try {
      const res = await fetch('/api/v1/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiKey ? { apiKey } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        return { valid: false, message: json.error?.message || `HTTP ${res.status}` };
      }
      return json.data || json;
    } catch (err: any) {
      return { valid: false, message: err.message || 'Network error reaching test endpoint' };
    }
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    testKey,
    reload: fetchSettings,
  };
}

// ── B4: useEngineStatus Hook (Single Server Truth) ─────────────
export interface EngineStatus {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'simulation' | 'down';
  mode: 'live' | 'simulation';
  reason?: string;
  model: string;
  keyLast4?: string;
  keySource?: string;
  runnerActive: boolean;
  keyConfigured: boolean;
  dbStatus: string;
  details?: Record<string, any>;
}

export function useEngineStatus() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    ok: true,
    status: 'simulation',
    mode: 'simulation',
    model: 'gemini-2.5-flash',
    runnerActive: true,
    keyConfigured: false,
    dbStatus: 'healthy',
  });
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    try {
      const [liveRes, readyRes] = await Promise.all([
        fetch('/api/v1/health/live').catch(() => null),
        fetch('/api/v1/health/ready').catch(() => null),
      ]);

      let liveData: any = {};
      let readyData: any = {};

      if (liveRes && liveRes.ok) {
        const json = await liveRes.json();
        liveData = json.data || json;
      }
      if (readyRes && readyRes.ok) {
        const json = await readyRes.json();
        readyData = json.data || json;
      }

      const engine = readyData?.engine;
      const keyConfigured = engine?.keyConfigured ?? readyData?.probes?.gemini?.keyConfigured ?? false;
      const mode = (engine?.mode || (keyConfigured ? 'live' : 'simulation')) as 'live' | 'simulation';
      const runnerActive = liveData?.runner?.active ?? true;
      const dbStatus = liveData?.database?.status ?? 'healthy';

      let status: EngineStatus['status'] = 'healthy';
      if (mode === 'simulation') {
        status = 'simulation';
      } else if (!liveData?.status || liveData.status !== 'alive') {
        status = 'degraded';
      }

      setEngineStatus({
        ok: liveData?.status === 'alive',
        status,
        mode,
        reason: engine?.reason,
        keyLast4: engine?.keyLast4,
        keySource: engine?.keySource,
        model: engine?.model || readyData?.probes?.gemini?.model || 'gemini-2.5-flash',
        runnerActive,
        keyConfigured,
        dbStatus,
        details: { live: liveData, ready: readyData },
      });
    } catch {
      setEngineStatus((prev) => ({
        ...prev,
        ok: false,
        status: 'degraded',
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30_000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { ...engineStatus, loading, refresh: checkStatus };
}

// ── B1 & Resumable SSE: useSessionStream Hook ──────────────────
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'lost' | 'finished';

export function useSessionStream(sessionId: string | null | undefined) {
  const [session, setSession] = useState<DeliberationSession | null>(null);
  const [events, setEvents] = useState<CouncilSSEEvent[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);

  const seenSeqs = useRef<Set<number>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastSeqRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  // Fetch REST snapshot
  const loadInitialSnapshot = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Session not found');
          setConnectionState('lost');
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const s = json.data?.session || json.session;
      if (s) {
        setSession(s);
        if (s.status === 'COMPLETED' || s.status === 'FAILED' || s.status === 'CANCELLED') {
          setConnectionState('finished');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load session');
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    loadInitialSnapshot();

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionState('connecting');
      const url = `/api/v1/sessions/${sessionId}/stream?after=${lastSeqRef.current}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionState('live');
        setError(null);
      };

      const handleEvent = (ev: MessageEvent) => {
        try {
          const raw = JSON.parse(ev.data);
          // Standardize event shape (wrapped vs unwrapped)
          const sseEvent: CouncilSSEEvent = raw.event && raw.payload
            ? raw
            : {
                event: (ev.type as any) || 'persona_message',
                sessionId,
                timestamp: new Date().toISOString(),
                payload: raw,
                seq: raw.seq,
              };

          const seq = sseEvent.seq || (raw.seq as number) || (ev.lastEventId ? parseInt(ev.lastEventId, 10) : undefined);

          if (typeof seq === 'number') {
            if (seenSeqs.current.has(seq)) return;
            seenSeqs.current.add(seq);
            lastSeqRef.current = Math.max(lastSeqRef.current, seq);
          }

          setEvents((prev) => [...prev, sseEvent]);

          // Live session state mutations based on event type
          if (sseEvent.event === 'phase_started') {
            const phase = (sseEvent.payload as any)?.phase;
            if (phase) {
              setSession((prev) => (prev ? { ...prev, currentPhase: phase } : prev));
            }
          } else if (sseEvent.event === 'moderator_draft') {
            const draft = sseEvent.payload as any;
            if (draft) {
              setSession((prev) => {
                if (!prev) return prev;
                const existing = prev.convergenceDrafts || [];
                return { ...prev, convergenceDrafts: [...existing, draft] };
              });
            }
          } else if (sseEvent.event === 'cross_exam_round_complete') {
            const r = (sseEvent.payload as any)?.roundNumber;
            if (typeof r === 'number') {
              setSession((prev) => (prev ? { ...prev, currentCrossExamRound: r } : prev));
            }
          }

          // Handle terminal events
          if (sseEvent.event === 'final_verdict' || sseEvent.event === 'done') {
            isFinishedRef.current = true;
            setConnectionState('finished');
            if (sseEvent.event === 'final_verdict') {
              const verdict = sseEvent.payload as any;
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      status: 'completed' as any,
                      currentPhase: 'PHASE_5_FINAL_OUTPUT',
                      finalVerdict: verdict,
                    }
                  : prev
              );
            }
            loadInitialSnapshot();
          } else if (sseEvent.event === 'session_error') {
            setConnectionState('lost');
            setError((sseEvent.payload as any)?.message || 'Session error');
          }
        } catch {
          // ignore unparseable keep-alives
        }
      };

      // Listen on all standard event types
      const eventTypes = [
        'phase_started',
        'persona_message',
        'position_update',
        'cross_exam_round_complete',
        'moderator_draft',
        'ratification_vote',
        'ratification_cycle_complete',
        'persona_unavailable',
        'final_verdict',
        'session_error',
        'done',
      ];

      for (const t of eventTypes) {
        es.addEventListener(t, handleEvent);
      }
      es.onmessage = handleEvent;

      es.onerror = () => {
        es.close();
        if (!isFinishedRef.current) {
          setConnectionState('reconnecting');
          setTimeout(() => {
            if (!isFinishedRef.current) {
              connectSSE();
            }
          }, 3000);
        }
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [sessionId, loadInitialSnapshot]);

  const cancel = useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/v1/sessions/${sessionId}/cancel`, { method: 'POST' });
      setConnectionState('finished');
      loadInitialSnapshot();
    } catch {
      // ignore
    }
  }, [sessionId, loadInitialSnapshot]);

  return {
    session,
    events,
    connectionState,
    error,
    cancel,
    refresh: loadInitialSnapshot,
  };
}

// ── useUsage Hook ──────────────────────────────────────────────
export interface UsageSummary {
  monthlySpendUSD: number;
  monthlySpendCapUSD: number;
  remainingHeadroomUSD: number;
  utilizationPercent: number;
  allTimeSpendUSD: number;
  totalCalls: number;
  totalPromptTokens: number;
  totalCandidateTokens: number;
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageSummary>({
    monthlySpendUSD: 0,
    monthlySpendCapUSD: 10,
    remainingHeadroomUSD: 10,
    utilizationPercent: 0,
    allTimeSpendUSD: 0,
    totalCalls: 0,
    totalPromptTokens: 0,
    totalCandidateTokens: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/usage');
      if (!res.ok) return;
      const json = await res.json();
      const raw = json.data?.usage || json.usage;
      if (raw) {
        setUsage(raw);
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 10000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  return { usage, loading, refresh: fetchUsage };
}

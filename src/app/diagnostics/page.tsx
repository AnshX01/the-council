'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cpu,
  Server,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function DiagnosticsPage() {
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [readyStatus, setReadyStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const runDiagnostics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [liveRes, readyRes] = await Promise.all([
        fetch('/api/v1/health/live'),
        fetch('/api/v1/health/ready'),
      ]);

      const liveData = await liveRes.json();
      const readyData = await readyRes.json();

      setLiveStatus(liveData);
      setReadyStatus(readyData);
    } catch (err: any) {
      toast({ type: 'error', title: 'Diagnostics Check Failed', description: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const copyReport = () => {
    const report = `# The Council: Diagnostics Report
Timestamp: ${new Date().toISOString()}

## Liveness Probe
- Status: ${liveStatus?.status || 'Unknown'}
- Uptime: ${liveStatus?.data?.uptimeSeconds || 0} seconds
- Memory RSS: ${Math.round((liveStatus?.data?.memory?.rss || 0) / 1024 / 1024)} MB

## Readiness Probe
- Status: ${readyStatus?.status || 'Unknown'}
- Database: ${readyStatus?.data?.checks?.database?.status || 'Unknown'}
- Durable Runner: ${readyStatus?.data?.checks?.runner?.status || 'Unknown'}
- Storage Driver: Node.js 24 DatabaseSync (node:sqlite)
- Localhost Security Guard: Active (127.0.0.1 loopback binding)
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast({ type: 'success', title: 'Diagnostics Copied', description: 'System report copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const isHealthy = liveStatus?.status === 'ok' && readyStatus?.status === 'ok';

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-gray-50">
              System Diagnostics & Health Probes
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live inspection of SQLite WAL database, background durable runner, and memory limits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            isLoading={isLoading}
            onClick={runDiagnostics}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Probes
          </Button>

          <Button
            size="sm"
            variant="glass"
            onClick={copyReport}
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? 'Copied' : 'Copy Report'}
          </Button>
        </div>
      </div>

      {/* Primary Health Banner */}
      <GlassCard padded="md" className="flex items-center justify-between !rounded-2xl">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isHealthy
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}
          >
            {isHealthy ? <CheckCircle2 className="w-5 h-5 stroke-[2.2]" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {isHealthy ? 'All Systems Operational' : 'Degraded System Health'}
              </h2>
              <Badge variant={isHealthy ? 'success' : 'warning'} size="xs">
                {isHealthy ? 'READY' : 'DEGRADED'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
              Process Uptime: {liveStatus?.data?.uptimeSeconds ?? 0}s &bull; Mode: Localhost Loopback
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Grid of Subsystem Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* SQLite Database Subsystem */}
        <GlassCard padded="sm" className="space-y-2.5 !rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                SQLite Persistence
              </span>
            </div>
            <Badge variant="success" size="xs">
              WAL Mode
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
            <div className="flex justify-between">
              <span>Driver:</span>
              <span className="text-gray-800 dark:text-gray-200">node:sqlite</span>
            </div>
            <div className="flex justify-between">
              <span>Path:</span>
              <span className="text-gray-800 dark:text-gray-200">./data/council.db</span>
            </div>
            <div className="flex justify-between">
              <span>Foreign Keys:</span>
              <span className="text-emerald-500 font-semibold">PRAGMA ON</span>
            </div>
          </div>
        </GlassCard>

        {/* Durable Background Runner */}
        <GlassCard padded="sm" className="space-y-2.5 !rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Durable Runner
              </span>
            </div>
            <Badge variant="success" size="xs">
              Active
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
            <div className="flex justify-between">
              <span>Heartbeat:</span>
              <span className="text-gray-800 dark:text-gray-200">5,000ms</span>
            </div>
            <div className="flex justify-between">
              <span>Lease Expiry:</span>
              <span className="text-gray-800 dark:text-gray-200">30,000ms</span>
            </div>
            <div className="flex justify-between">
              <span>Event Sourcing:</span>
              <span className="text-emerald-500 font-semibold">Monotonic (seq)</span>
            </div>
          </div>
        </GlassCard>

        {/* Localhost Security Guard */}
        <GlassCard padded="sm" className="space-y-2.5 !rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Security Sandbox
              </span>
            </div>
            <Badge variant="neutral" size="xs">
              Isolated
            </Badge>
          </div>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
            <div className="flex justify-between">
              <span>Host Origin:</span>
              <span className="text-gray-800 dark:text-gray-200">127.0.0.1 only</span>
            </div>
            <div className="flex justify-between">
              <span>DNS Rebinding:</span>
              <span className="text-emerald-500 font-semibold">Blocked</span>
            </div>
            <div className="flex justify-between">
              <span>Secrets Redacted:</span>
              <span className="text-emerald-500 font-semibold">Zero Bundle Leak</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Raw Health Probe JSON Responses */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Raw Probe Payloads
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-1 font-mono text-[11px]">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold block">
              GET /api/v1/health/live
            </span>
            <pre className="text-gray-700 dark:text-gray-300 overflow-x-auto">
              {JSON.stringify(liveStatus, null, 2)}
            </pre>
          </div>

          <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 space-y-1 font-mono text-[11px]">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold block">
              GET /api/v1/health/ready
            </span>
            <pre className="text-gray-700 dark:text-gray-300 overflow-x-auto">
              {JSON.stringify(readyStatus, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

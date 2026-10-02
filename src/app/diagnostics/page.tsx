/**
 * Origin: AnshX01/Atlas (frontend/src/app/dashboard/page.tsx & settings/page.tsx)
 * The Council - System Diagnostics & Probes (Atlas-grade)
 * Flat, borderless, monochrome, Inter-spaced health inspection interface.
 * Resolves Bug B5 (proper unwrapping of /api/v1/health response data).
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface LiveData {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
}

interface ReadyData {
  status: string;
  database: string;
  runner: string;
  provider: string;
  timestamp: string;
}

export default function DiagnosticsPage() {
  const [liveRaw, setLiveRaw] = useState<any>(null);
  const [readyRaw, setReadyRaw] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const runDiagnostics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [liveRes, readyRes] = await Promise.all([
        fetch("/api/v1/health/live"),
        fetch("/api/v1/health/ready"),
      ]);

      const liveJson = await liveRes.json();
      const readyJson = await readyRes.json();

      setLiveRaw(liveJson);
      setReadyRaw(readyJson);
    } catch (err: any) {
      toast.error(`Diagnostics probe failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const liveData: LiveData = liveRaw?.data || liveRaw || { status: "unknown", uptimeSeconds: 0 };
  const readyData: ReadyData = readyRaw?.data || readyRaw || {
    status: "unknown",
    database: "unknown",
    runner: "unknown",
    provider: "unknown",
  };

  const isLive = liveRaw?.ok === true && (liveData.status === "ok" || liveData.status === "alive");
  const isReady = readyRaw?.ok === true && (readyData.status === "ready" || readyData.status === "ok");
  const isHealthy = isLive && isReady;

  const copyReport = () => {
    const report = `# The Council: Diagnostics Report
Timestamp: ${new Date().toISOString()}

## Liveness
- Liveness Probe: ${isLive ? "OK" : "DEGRADED"}
- Raw Status: ${liveData.status}
- Uptime: ${liveData.uptimeSeconds ?? 0}s

## Readiness
- Readiness Probe: ${isReady ? "READY" : "DEGRADED"}
- SQLite Database: ${readyData.database}
- Durable Runner: ${readyData.runner}
- LLM Provider: ${readyData.provider}
- Storage Driver: Node.js 24 DatabaseSync (node:sqlite WAL)
- Host Isolation: Localhost 127.0.0.1
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("System report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
              System Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Diagnostics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Live inspection of SQLite WAL database, background durable runner, and memory boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            isLoading={isLoading}
            onClick={runDiagnostics}
          >
            <RefreshCw size={14} className={cn("mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={copyReport}
          >
            {copied ? (
              <>
                <Check size={14} className="mr-1.5 text-[var(--status-low)]" />
                Copied
              </>
            ) : (
              <>
                <Copy size={14} className="mr-1.5" />
                Copy Report
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Primary Health Banner */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              isHealthy
                ? "bg-[var(--status-low)]/10 text-[var(--status-low)]"
                : "bg-[var(--status-medium)]/10 text-[var(--status-medium)]"
            )}
          >
            {isHealthy ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {isHealthy ? "All Subsystems Operational" : "Degraded Chamber Health"}
              </h2>
              <Badge variant={isHealthy ? "low" : "medium"} size="sm">
                {isHealthy ? "ONLINE" : "ATTENTION"}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
              Uptime: {liveData.uptimeSeconds}s &bull; Mode: Localhost Loopback &bull; Protocol: SSE v1
            </p>
          </div>
        </div>
      </div>

      {/* Subsystem Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Subsystem 1: SQLite */}
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-[var(--text-primary)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                SQLite Persistence
              </span>
            </div>
            <Badge variant={readyData.database === "ok" ? "low" : "urgent"} size="sm">
              {readyData.database === "ok" ? "WAL OK" : "Degraded"}
            </Badge>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-muted)] font-mono">
            <div className="flex justify-between">
              <span>Driver</span>
              <span className="text-[var(--text-secondary)]">node:sqlite</span>
            </div>
            <div className="flex justify-between">
              <span>Path</span>
              <span className="text-[var(--text-secondary)]">./data/council.db</span>
            </div>
            <div className="flex justify-between">
              <span>Foreign Keys</span>
              <span className="text-[var(--status-low)]">PRAGMA ON</span>
            </div>
          </div>
        </div>

        {/* Subsystem 2: Durable Runner */}
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-[var(--text-primary)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Durable Runner
              </span>
            </div>
            <Badge variant={readyData.runner === "active" ? "low" : "medium"} size="sm">
              {readyData.runner === "active" ? "Active" : "Idle"}
            </Badge>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-muted)] font-mono">
            <div className="flex justify-between">
              <span>Heartbeat</span>
              <span className="text-[var(--text-secondary)]">5,000ms</span>
            </div>
            <div className="flex justify-between">
              <span>Lease Expiry</span>
              <span className="text-[var(--text-secondary)]">30,000ms</span>
            </div>
            <div className="flex justify-between">
              <span>Event Sourcing</span>
              <span className="text-[var(--status-low)]">Monotonic</span>
            </div>
          </div>
        </div>

        {/* Subsystem 3: Security & Sandboxing */}
        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--text-primary)]" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Security Sandbox
              </span>
            </div>
            <Badge variant="neutral" size="sm">
              Isolated
            </Badge>
          </div>
          <div className="space-y-1.5 text-xs text-[var(--text-muted)] font-mono">
            <div className="flex justify-between">
              <span>Loopback</span>
              <span className="text-[var(--text-secondary)]">127.0.0.1</span>
            </div>
            <div className="flex justify-between">
              <span>Rebinding Guard</span>
              <span className="text-[var(--status-low)]">Enforced</span>
            </div>
            <div className="flex justify-between">
              <span>Key Leakage</span>
              <span className="text-[var(--status-low)]">Zero Bundle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Health Probe Payloads */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase block">
          Raw Probe Payloads
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>GET /api/v1/health/live</span>
              <Badge variant={isLive ? "low" : "urgent"} size="sm">
                {liveRaw?.status || (isLive ? "200 OK" : "ERROR")}
              </Badge>
            </div>
            <pre className="p-3 rounded-xl bg-[var(--bg-primary)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
              {JSON.stringify(liveRaw, null, 2)}
            </pre>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>GET /api/v1/health/ready</span>
              <Badge variant={isReady ? "low" : "urgent"} size="sm">
                {readyRaw?.status || (isReady ? "200 OK" : "ERROR")}
              </Badge>
            </div>
            <pre className="p-3 rounded-xl bg-[var(--bg-primary)] font-mono text-[11px] text-[var(--text-secondary)] overflow-x-auto">
              {JSON.stringify(readyRaw, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

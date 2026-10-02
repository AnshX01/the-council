/**
 * Origin: The Council — Primary Deliberation Chamber (Section 5.3)
 * Dual-column Atlas layout: Sticky Round Table v3 on left, segmented tabs on right
 * (Verdict · Transcript · Shifts · Details). Resumable SSE streaming with Last-Event-ID.
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCcw,
  StopCircle,
  FileText,
  Copy,
  Download,
  Clock,
  Compass,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { RoundTable } from "@/components/council/RoundTable/RoundTable";
import { PhaseStepper } from "@/components/council/PhaseStepper";
import { TranscriptStream } from "@/components/council/TranscriptStream";
import { VerdictPanel } from "@/components/council/VerdictPanel";
import { TrajectoryChart } from "@/components/council/TrajectoryChart";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSessionStream } from "@/lib/ui/hooks";
import { toast } from "@/components/ui/Toast";
import { PersonaProfile } from "@/types/persona";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChamberPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();

  const {
    session,
    events,
    connectionState,
    error,
    cancel,
    refresh,
  } = useSessionStream(sessionId);

  const [activeTab, setActiveTab] = useState<string>("transcript");
  const [selectedPersonaForDrawer, setSelectedPersonaForDrawer] = useState<PersonaProfile | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Switch default tab to Verdict when session finishes
  const sAny = (session || {}) as any;
  const statusStr = (sAny.status || "").toUpperCase();
  const isRunning = statusStr === "RUNNING";
  const isCompleted = statusStr === "COMPLETED";
  const isFinished =
    connectionState === "finished" ||
    isCompleted ||
    statusStr === "FAILED" ||
    statusStr === "CANCELLED" ||
    statusStr === "ABORTED" ||
    session?.currentPhase === "PHASE_5_FINAL_OUTPUT";

  useEffect(() => {
    if (isFinished) {
      setActiveTab("verdict");
    }
  }, [isFinished]);

  // Derive current speaker & active interaction from events
  const latestMessage = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].event === "persona_message") {
        return events[i].payload as any;
      }
    }
    return null;
  }, [events]);

  const currentSpeakerId = latestMessage?.personaId || null;
  const lastSpeakerSnippet = latestMessage?.content || null;

  const activeInteraction = useMemo(() => {
    if (latestMessage?.targetPersonaId && latestMessage?.personaId) {
      return {
        sourceId: latestMessage.personaId,
        targetId: latestMessage.targetPersonaId,
        stance: latestMessage.action || "AGREE",
      };
    }
    return null;
  }, [latestMessage]);

  const handleCopySummary = useCallback(() => {
    if (!session) return;
    const title = sAny.title || session.rawQuery || "Deliberation";
    const conclusion = session.finalVerdict?.verdictOneLiner || sAny.finalVerdict?.conclusion || "In progress";
    const summary = `DELIBERATION: ${title}\nStatus: ${statusStr}\nVerdict: ${conclusion}`;
    navigator.clipboard.writeText(summary);
    toast.success("Summary copied to clipboard");
  }, [session, sAny.title, sAny.finalVerdict?.conclusion, statusStr]);

  const handleRerun = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/rerun`, { method: "POST" });
      const json = await res.json();
      const newId = json.data?.session?.id || json.session?.id;
      if (newId) {
        toast.success("Rerunning deliberation in new session...");
        router.push(`/c/${newId}`);
      }
    } catch {
      toast.error("Failed to rerun deliberation");
    }
  };

  const handleExport = (format: "md" | "json" | "txt") => {
    window.open(`/api/v1/sessions/${sessionId}/export?format=${format}`, "_blank");
    setShowExportMenu(false);
  };

  // Listen for custom event from Command Palette
  useEffect(() => {
    const handleCopyEvent = () => handleCopySummary();
    window.addEventListener("council:copy-summary", handleCopyEvent);
    return () => window.removeEventListener("council:copy-summary", handleCopyEvent);
  }, [handleCopySummary]);

  const tabs: TabItem[] = [
    { id: "verdict", label: "Verdict" },
    { id: "transcript", label: "Transcript", badge: events.length },
    { id: "shifts", label: "Shifts" },
    { id: "details", label: "Details" },
  ];

  if (error && !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] max-w-md mx-auto mt-12">
        <AlertTriangle size={32} className="text-[var(--status-urgent)] mb-3" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--status-urgent)] mb-1">
          Deliberation Error
        </span>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
          Deliberation session not found.
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-6">
          The requested deliberation ID does not exist in local SQLite storage.
        </p>
        <Link href="/" className="inline-flex">
          <Button variant="secondary" size="md">
            Return to Chamber Entrance
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Chamber Header: Breadcrumb Back, Title Clamp, Status, Action Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex-shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Deliberation Chamber
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate max-w-md" title={sAny.title || session?.rawQuery || "Deliberating..."}>
                {sAny.title || session?.rawQuery || "Convening Council..."}
              </h1>
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-[var(--status-low)] animate-pulse flex-shrink-0" />
              )}
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)] truncate">
              Session #{sessionId.slice(0, 12)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 relative">
          {isRunning && (
            <Button
              variant="danger"
              size="sm"
              onClick={cancel}
              leftIcon={<StopCircle size={13} />}
            >
              Cancel
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRerun}
            leftIcon={<RotateCcw size={13} />}
          >
            Rerun
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              leftIcon={<Download size={13} />}
              rightIcon={<ChevronDown size={12} />}
            >
              Export
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 w-36 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-none flex flex-col gap-0.5 animate-spring-scale">
                <button
                  onClick={() => handleExport("md")}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Markdown (.md)
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  JSON (.json)
                </button>
                <button
                  onClick={() => handleExport("txt")}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Plaintext (.txt)
                </button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopySummary}
            leftIcon={<Copy size={13} />}
          >
            Copy
          </Button>
        </div>
      </header>

      {/* Slim 6-Segment Phase Stepper */}
      <PhaseStepper
        currentPhase={session?.currentPhase || "PHASE_0_FRAMING"}
        phaseDurations={sAny.phaseDurations}
      />

      {/* Main Dual-Column Deliberation Chamber (>= 1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Sticky Round Table Stage (5 Columns) */}
        <div className="lg:col-span-6 xl:col-span-5 lg:sticky lg:top-4 flex flex-col items-center">
          <RoundTable
            currentSpeakerId={currentSpeakerId}
            activeInteraction={activeInteraction}
            openingPositions={session?.openingPositions}
            crossExamRounds={session?.crossExamRounds}
            ratificationVotes={sAny.ratificationVotes || (session?.ratificationCycles?.length ? session.ratificationCycles[session.ratificationCycles.length - 1].votes : undefined)}
            phase={session?.currentPhase || "PHASE_0_FRAMING"}
            roundNumber={session?.crossExamRounds?.length || 1}
            maxRounds={session?.options?.maxCrossExamRounds || 3}
            convergenceScore={sAny.convergenceScore || (session?.convergenceDrafts?.length ? session.convergenceDrafts[session.convergenceDrafts.length - 1].alignmentScore : 0)}
            isUnanimous={Boolean(session?.finalVerdict?.isUnanimous || sAny.finalVerdict?.verdictType === "UNANIMOUS" || session?.finalVerdict?.status === "UNANIMOUS_CONSENSUS")}
            status={isRunning ? "running" : isCompleted ? "completed" : "idle"}
            lastSpeakerSnippet={lastSpeakerSnippet}
            allEvents={events}
            onSelectPersona={(p) => setSelectedPersonaForDrawer(p)}
            onViewVerdict={() => setActiveTab("verdict")}
          />
        </div>

        {/* Right Column: Segmented Tabs (7 Columns) */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-4">
          {/* Atlas Segmented Tab Bar */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          {/* Tab 1: Verdict Tab (Hero, Pillars, Caveats, Dissent) */}
          {activeTab === "verdict" && (
            <div className="animate-fade-in">
              {session ? (
                <VerdictPanel session={session} />
              ) : (
                <div className="py-16 text-center text-xs text-[var(--text-muted)]">
                  Loading verdict...
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Transcript Tab (Safe Markdown, Divider Rows, Virtualized) */}
          {activeTab === "transcript" && (
            <div className="h-[600px] animate-fade-in">
              <TranscriptStream events={events} />
            </div>
          )}

          {/* Tab 3: Shifts Tab (Compact Rows, Sparklines, Badges - B6 Fix) */}
          {activeTab === "shifts" && (
            <div className="animate-fade-in">
              <TrajectoryChart
                session={session}
                events={events}
                onSelectPersona={(p) => setSelectedPersonaForDrawer(p)}
              />
            </div>
          )}

          {/* Tab 4: Details Tab */}
          {activeTab === "details" && session && (
            <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-4 text-xs animate-fade-in">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                Deliberation Telemetry & Parameters
              </span>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">Model ID</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    {sAny.modelUsed || sAny.model_used || "gemini-2.5-flash"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">Debate Rounds</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    {session.crossExamRounds?.length || 0} of {session.options?.maxCrossExamRounds || 3}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">Total LLM Calls</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    {sAny.totalLLMCalls || session.totalCallsExecuted || sAny.call_count || 0} calls
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-muted)]">Estimated Spend</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">
                    ${((sAny.estimatedCostUSD || sAny.cost_estimate_usd || 0)).toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--text-muted)]">Original Dilemma Query</span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                  {sAny.query || session.rawQuery}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

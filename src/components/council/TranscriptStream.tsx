/**
 * Origin: The Council — Transcript Stream (Section 5.3)
 * Atlas-style tonal rows on base surface, safe markdown, persona stance badges,
 * slim system dividers, virtualized scrolling, and throttled aria-live announcements.
 */

"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  ArrowDown,
  Filter,
  User,
  Crown,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
  Check,
  Zap,
  Hand,
} from "lucide-react";
import { CouncilSSEEvent } from "@/types/events";
import { PersonaId } from "@/types/persona";
import { findPersonaById } from "@/lib/council/personas";
import { selectTranscriptRows, TranscriptItem } from "@/lib/ui/selectors";
import { cn } from "@/lib/utils";

const GLYPH_MAP: Record<string, React.ElementType> = {
  Crown,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
};

export interface TranscriptStreamProps {
  events: CouncilSSEEvent[];
  className?: string;
}

export const TranscriptStream: React.FC<TranscriptStreamProps> = ({
  events,
  className = "",
}) => {
  const [selectedPersona, setSelectedPersona] = useState<string>("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const lastAnnounceTimeRef = useRef<number>(0);

  // Derive typed transcript items via pure selector (B7 fix)
  const rows = useMemo(() => selectTranscriptRows(events), [events]);

  // Throttled aria-live announcement
  useEffect(() => {
    if (rows.length === 0) return;
    const latest = rows[rows.length - 1];
    const now = Date.now();
    if (now - lastAnnounceTimeRef.current >= 1000) {
      lastAnnounceTimeRef.current = now;
      if (latest.type === "narrative") {
        setLiveAnnouncement(`${latest.personaId}: ${latest.content.slice(0, 80)}...`);
      } else {
        setLiveAnnouncement(latest.label);
      }
    }
  }, [rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((item) => {
      if (item.type === "narrative") {
        if (selectedPersona !== "all" && item.personaId !== selectedPersona) return false;
        if (selectedPhase !== "all" && item.phase !== selectedPhase) return false;
      }
      return true;
    });
  }, [rows, selectedPersona, selectedPhase]);

  // Auto-scroll to bottom unless user scrolled up
  useEffect(() => {
    if (!isScrolledUp && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [filteredRows, isScrolledUp]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 100;
    setIsScrolledUp(isUp);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsScrolledUp(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full relative select-text", className)}>
      {/* Throttled Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Filter Controls Row */}
      <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] gap-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Filter size={13} />
          <span className="text-[11px] font-medium">Filter:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Persona Filter */}
          <select
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-2 py-1 rounded-lg text-xs outline-none cursor-pointer"
            aria-label="Filter transcript by persona"
          >
            <option value="all">All Members</option>
            <option value="moderator">Moderator</option>
            <option value="skeptic">Skeptic</option>
            <option value="optimist">Optimist</option>
            <option value="ethicist">Ethicist</option>
            <option value="pragmatist">Pragmatist</option>
            <option value="systems_thinker">Systems Thinker</option>
            <option value="historian">Historian</option>
            <option value="humanist">Humanist</option>
            <option value="contrarian">Contrarian</option>
          </select>

          {/* Phase Filter */}
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-2 py-1 rounded-lg text-xs outline-none cursor-pointer"
            aria-label="Filter transcript by phase"
          >
            <option value="all">All Phases</option>
            <option value="PHASE_0_FRAMING">Framing</option>
            <option value="PHASE_1_OPENING">Opening</option>
            <option value="PHASE_2_CROSS_EXAM">Cross-Exam</option>
            <option value="PHASE_4_RATIFICATION">Ratification</option>
            <option value="PHASE_5_FINAL_OUTPUT">Verdict</option>
          </select>
        </div>
      </div>

      {/* Main Transcript Rows Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1"
      >
        {filteredRows.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-muted)]">
            Awaiting council statements...
          </div>
        ) : (
          filteredRows.map((row) => {
            if (row.type === "system_divider") {
              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 py-2 text-center select-none"
                >
                  <div className="flex-1 h-[1px] bg-[var(--border-subtle)]" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                      {row.label}
                    </span>
                    {row.detail && (
                      <span className="text-[11px] text-[var(--text-secondary)] max-w-md">
                        {row.detail}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 h-[1px] bg-[var(--border-subtle)]" />
                </div>
              );
            }

            // Narrative row
            const persona = findPersonaById(row.personaId);
            const color = persona?.colorHex || "#6366F1";
            const targetPersona = row.targetPersonaId ? findPersonaById(row.targetPersonaId) : null;

            return (
              <div
                key={row.id}
                className="p-3.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-2 transition-colors"
              >
                {/* Header: Persona Avatar, Name, Stance Badge, Seq, Confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const GlyphIcon = (persona?.avatarGlyph && GLYPH_MAP[persona.avatarGlyph]) || User;
                      return (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${color}20`,
                            color,
                          }}
                          title={persona?.name || row.personaId}
                        >
                          <GlyphIcon size={12} strokeWidth={2.2} />
                        </div>
                      );
                    })()}
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {persona?.name || row.personaId}
                    </span>

                    {/* Stance Badge */}
                    {row.action && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium",
                          row.action === "AGREE" && "bg-[var(--status-low)]/10 text-[var(--status-low)]",
                          row.action === "CHALLENGE" && "bg-[var(--status-urgent)]/10 text-[var(--status-urgent)]",
                          row.action === "CONCEDE" && "bg-[var(--status-medium)]/10 text-[var(--status-medium)]"
                        )}
                      >
                        {row.action === "AGREE" && <Check size={10} />}
                        {row.action === "CHALLENGE" && <Zap size={10} />}
                        {row.action === "CONCEDE" && <Hand size={10} />}
                        <span>
                          {row.action}
                          {targetPersona && ` → ${targetPersona.name}`}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                    {row.confidence !== undefined && (
                      <span>{row.confidence}%</span>
                    )}
                    {row.seq !== undefined && <span>#{row.seq}</span>}
                  </div>
                </div>

                {/* Message Body with Safe Markdown */}
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                  >
                    {row.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* "Jump to Latest" Pill */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] text-xs font-medium flex items-center gap-1.5 shadow-none animate-spring-scale"
        >
          <ArrowDown size={13} />
          <span>Jump to latest</span>
        </button>
      )}
    </div>
  );
};

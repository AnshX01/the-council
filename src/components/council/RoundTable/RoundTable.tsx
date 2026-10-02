/**
 * Origin: The Council Round Table v3 / v4 (Section 6 & RT4 §1-§5)
 * Hero Circular Council Table:
 * - Moderator anchored at 12 o'clock (head of table)
 * - Tonal glass table disc with inner rim, tick marks, and speaker spotlight
 * - 9 seated personas with chair-back arcs, outward labels, and confidence rings
 * - Live SVG dialogue arcs with directed arrowheads and traveling pulse particles
 * - Center convergence / ratification medallion
 * - Docked live speaker caption strip under the stage (R3)
 * - Segmented Table | Map | Matrix | List view switcher
 * - Accessible List View toggle & roving tabindex keyboard navigation
 */

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ALL_PERSONAS,
  COUNCIL_MEMBERS,
  PersonaProfile,
  findPersonaById,
} from "@/lib/council/personas";
import {
  computeSeatLayout,
  computeInteractionArc,
  TABLE_CONSTANTS,
  SeatPersona,
} from "@/lib/council/geometry";
import { SeatNode } from "./SeatNode";
import { InteractionArc, InteractionStance } from "./InteractionArc";
import { VerdictSeal } from "./VerdictSeal";
import { PersonaDrawer } from "./PersonaDrawer";
import { ReplayScrubber } from "./ReplayScrubber";
import { PersonaId } from "@/types/persona";
import {
  DeliberationPhase,
  OpeningPosition,
  CrossExamRound,
  RatificationVote,
} from "@/types/session";
import { CouncilSSEEvent } from "@/types/events";
import {
  selectConfidenceTrajectories,
  selectSeatStates,
  selectInteractionGraph,
} from "@/lib/ui/selectors";
import { List, CircleDot, Network, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveInteraction {
  sourceId: PersonaId;
  targetId: PersonaId;
  stance: InteractionStance;
}

export interface RoundTableProps {
  memberStatuses?: Record<PersonaId, "active" | "unavailable">;
  currentSpeakerId?: PersonaId | null;
  activeInteraction?: ActiveInteraction | null;
  openingPositions?: Partial<Record<PersonaId, OpeningPosition>>;
  crossExamRounds?: CrossExamRound[];
  ratificationVotes?: Partial<Record<PersonaId, RatificationVote | 'sign_off' | 'amendment' | 'dissent'>>;
  phase?: DeliberationPhase;
  roundNumber?: number;
  maxRounds?: number;
  convergenceScore?: number;
  isUnanimous?: boolean;
  status?: "idle" | "running" | "completed" | "failed" | "aborted";
  lastSpeakerSnippet?: string;
  allEvents?: CouncilSSEEvent[];
  onSelectPersona?: (persona: PersonaProfile) => void;
  onViewVerdict?: () => void;
  replayStep?: number;
  totalReplaySteps?: number;
  onReplayStepChange?: (step: number) => void;
  className?: string;
}

interface ArcTrailEntry {
  sourceId: PersonaId;
  targetId: PersonaId;
  stance: InteractionStance;
  timestamp: number;
}

const STATIC_SEAT_PERSONAS: SeatPersona[] = ALL_PERSONAS.map((p) => ({
  id: p.id,
  name: p.name,
  role: p.id === "moderator" ? "moderator" : "voting",
  color: p.colorHex,
}));

export type TableViewMode = "table" | "map" | "matrix" | "list";

export const RoundTable: React.FC<RoundTableProps> = ({
  memberStatuses = {} as Record<PersonaId, "active" | "unavailable">,
  currentSpeakerId,
  activeInteraction,
  openingPositions = {},
  crossExamRounds = [],
  ratificationVotes = {},
  phase = "PHASE_0_FRAMING",
  roundNumber = 1,
  maxRounds = 3,
  convergenceScore = 0,
  isUnanimous = false,
  status = "idle",
  lastSpeakerSnippet,
  allEvents = [],
  onSelectPersona,
  onViewVerdict,
  replayStep,
  totalReplaySteps,
  onReplayStepChange,
  className = "",
}) => {
  const [viewMode, setViewMode] = useState<TableViewMode>("table");
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [focusedSeatIndex, setFocusedSeatIndex] = useState<number>(0);
  const [arcTrail, setArcTrail] = useState<ArcTrailEntry[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  // Compute layout using R2 & RT4 design space constants (640x640, Rs=190, Rt=152)
  const layout = useMemo(
    () => computeSeatLayout(STATIC_SEAT_PERSONAS, TABLE_CONSTANTS.DESIGN_SIZE),
    []
  );

  const center = { x: TABLE_CONSTANTS.CENTER, y: TABLE_CONSTANTS.CENTER };
  const tableDiscRadius = TABLE_CONSTANTS.TABLE_RADIUS;
  const innerRingRadius = tableDiscRadius * TABLE_CONSTANTS.INNER_RING_FACTOR;

  // Compute confidence trajectories and seat states
  const trajectories = useMemo(() => {
    return selectConfidenceTrajectories(allEvents.length > 0 ? allEvents : null);
  }, [allEvents]);

  const seatStates = useMemo(() => {
    const unavailMap: Partial<Record<PersonaId, string>> = {};
    for (const [pid, st] of Object.entries(memberStatuses)) {
      if (st === "unavailable") {
        unavailMap[pid as PersonaId] = "Persona unavailable";
      }
    }
    return selectSeatStates(
      trajectories,
      currentSpeakerId,
      activeInteraction?.targetId,
      activeInteraction?.stance,
      unavailMap
    );
  }, [trajectories, currentSpeakerId, activeInteraction, memberStatuses]);

  // Track arc trails (keep last 3 arcs with fading opacities, ignoring self-targets R5)
  useEffect(() => {
    if (activeInteraction && activeInteraction.sourceId !== activeInteraction.targetId) {
      setArcTrail((prev) => {
        const next = [
          {
            sourceId: activeInteraction.sourceId,
            targetId: activeInteraction.targetId,
            stance: activeInteraction.stance,
            timestamp: Date.now(),
          },
          ...prev.slice(0, 2),
        ];
        return next;
      });
    }
  }, [activeInteraction]);

  // Interaction graph reducer (Map & Matrix views)
  const interactionGraph = useMemo(() => {
    return selectInteractionGraph(allEvents);
  }, [allEvents]);

  // Listen for custom event to toggle list view
  useEffect(() => {
    const handleToggle = () => {
      setViewMode((v) => (v === "table" ? "list" : "table"));
    };
    window.addEventListener("council:toggle-table-view", handleToggle);
    return () => window.removeEventListener("council:toggle-table-view", handleToggle);
  }, []);

  // Keyboard navigation across seats
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = layout.seats.length;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSeatIndex((i) => (i + 1) % total);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSeatIndex((i) => (i - 1 + total) % total);
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedSeatIndex(0); // Moderator
    } else if (e.key === "Enter") {
      e.preventDefault();
      const seat = layout.seats[focusedSeatIndex];
      const p = findPersonaById(seat.id as PersonaId);
      if (p) {
        setSelectedPersona(p);
        onSelectPersona?.(p);
      }
    }
  };

  const speakingSeat = layout.seats.find((s) => s.id === currentSpeakerId);

  return (
    <div
      ref={stageRef}
      onKeyDown={handleKeyDown}
      className={cn("flex flex-col items-center select-none w-full", className)}
    >
      {/* Stage Header Controls (Table | Map | Matrix | List Segmented Control) */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            The Council Chamber
          </span>
          {status === "running" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--status-low)]/10 text-[var(--status-low)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-low)] animate-pulse" />
              Deliberating
            </span>
          )}
        </div>

        {/* View Mode Segmented Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              viewMode === "table"
                ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
            title="Circular Round Table"
            aria-label="Table View"
          >
            <CircleDot size={13} />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              viewMode === "map"
                ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
            title="Interaction Network Map"
            aria-label="Network Map View"
          >
            <Network size={13} />
            <span className="hidden sm:inline">Map</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              viewMode === "matrix"
                ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
            title="Pairwise Interaction Matrix"
            aria-label="Matrix View"
          >
            <LayoutGrid size={13} />
            <span className="hidden sm:inline">Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              viewMode === "list"
                ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
            title="Accessible Member List"
            aria-label="List View"
          >
            <List size={13} />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {viewMode === "table" && (
        /* ── CIRCULAR ROUND TABLE STAGE (640x640 Vector Layout) ── */
        <div
          role="region"
          aria-label="The Council Round Table"
          className="relative w-full max-w-[640px] aspect-square flex items-center justify-center isolate z-0"
        >
          {/* Base SVG Canvas: Table Surface, Rim, Ticks, Spotlight & Arcs */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 640 640"
          >
            <defs>
              {/* Tonal Table Disc Radial Gradient */}
              <radialGradient id="tableSurfaceGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--bg-secondary)" stopOpacity="0.9" />
                <stop offset="85%" stopColor="var(--bg-tertiary)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--bg-secondary)" stopOpacity="1" />
              </radialGradient>

              {/* Active Speaker Spotlight Gradient */}
              {speakingSeat && (
                <radialGradient
                  id="speakerSpotlight"
                  cx={`${(speakingSeat.x / 640) * 100}%`}
                  cy={`${(speakingSeat.y / 640) * 100}%`}
                  r="60%"
                >
                  <stop
                    offset="0%"
                    stopColor={speakingSeat.color || "#6366F1"}
                    stopOpacity="0.08"
                  />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              )}
            </defs>

            {/* Concentric Table Surface Disc (R2) */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius}
              fill="url(#tableSurfaceGrad)"
            />

            {/* Defined Table Outer Rim (Crisp 1.5px border) */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth={1.5}
            />

            {/* Inset Bevel Line */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius - 3}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={1}
            />

            {/* Concentric Inner Ring at 0.62·Rt (R2) */}
            <circle
              cx={center.x}
              cy={center.y}
              r={innerRingRadius}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth={1}
              strokeDasharray="4 6"
              strokeOpacity={0.4}
            />

            {/* Speaker Spotlight */}
            {speakingSeat && (
              <circle
                cx={center.x}
                cy={center.y}
                r={tableDiscRadius}
                fill="url(#speakerSpotlight)"
              />
            )}

            {/* 9 Seat Angle Tick Marks on the Table Rim */}
            {layout.seats.map((seat) => {
              const tickInner = tableDiscRadius - 8;
              const tickOuter = tableDiscRadius;
              const x1 = center.x + tickInner * Math.cos(seat.angleRad);
              const y1 = center.y + tickInner * Math.sin(seat.angleRad);
              const x2 = center.x + tickOuter * Math.cos(seat.angleRad);
              const y2 = center.y + tickOuter * Math.sin(seat.angleRad);

              return (
                <line
                  key={`tick-${seat.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--text-muted)"
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                />
              );
            })}

            {/* Live Dialogue Arcs with Fading Trail, Directed Arrowheads & Particles */}
            {arcTrail.map((entry, idx) => {
              const s = layout.seats.find((st) => st.id === entry.sourceId);
              const t = layout.seats.find((st) => st.id === entry.targetId);
              if (!s || !t) return null;

              const opacity = idx === 0 ? 1.0 : idx === 1 ? 0.6 : 0.3;
              return (
                <InteractionArc
                  key={`arc-trail-${entry.timestamp}-${idx}`}
                  source={{ x: s.x, y: s.y }}
                  target={{ x: t.x, y: t.y }}
                  center={center}
                  stance={entry.stance}
                  speakerColor={s.color}
                  opacity={opacity}
                  isActive={idx === 0}
                />
              );
            })}
          </svg>

          {/* Center Medallion (Convergence Ring / Verdict Seal) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <VerdictSeal
              phase={phase}
              roundNumber={roundNumber}
              maxRounds={maxRounds}
              convergenceScore={convergenceScore}
              isUnanimous={isUnanimous}
              status={status}
              ratificationVotes={
                ratificationVotes as Record<string, "sign_off" | "amendment" | "dissent">
              }
              onViewVerdict={onViewVerdict}
            />
          </div>

          {/* HTML Seated Nodes (True Circular Stack with Concentric Discs & Halo Rings) */}
          {layout.seats.map((seat, index) => {
            const persona = findPersonaById(seat.id as PersonaId) || {
              id: seat.id as PersonaId,
              name: seat.name,
              title: seat.role,
              role: seat.role,
              archetype: seat.role,
              coreValues: [],
              avatarGlyph: "Crown",
              colorHex: seat.color || "#3B82F6",
            };

            const state = seatStates[seat.id as PersonaId];
            const isSpeaking = currentSpeakerId === seat.id;
            const vote = ratificationVotes[seat.id as PersonaId];

            return (
              <SeatNode
                key={seat.id}
                persona={persona as PersonaProfile}
                x={seat.x}
                y={seat.y}
                angleDeg={seat.angleDeg}
                isModerator={seat.isModerator}
                isSpeaking={isSpeaking}
                isUnavailable={state?.status === "unavailable"}
                confidence={state?.confidence ?? null}
                confidenceDelta={state?.delta}
                vote={vote}
                isSelected={selectedPersona?.id === seat.id}
                focused={focusedSeatIndex === index}
                tabIndex={focusedSeatIndex === index ? 0 : -1}
                onClick={() => {
                  setSelectedPersona(persona as PersonaProfile);
                  onSelectPersona?.(persona as PersonaProfile);
                }}
                onFocus={() => setFocusedSeatIndex(index)}
              />
            );
          })}
        </div>
      )}

      {viewMode === "map" && (
        /* ── INTERACTION NETWORK MAP VIEW (RT4 §5) ── */
        <div
          role="region"
          aria-label="The Council Interaction Network Map"
          className="relative w-full max-w-[640px] aspect-square flex items-center justify-center overflow-hidden isolate z-0"
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 640 640"
          >
            <defs>
              <radialGradient id="mapSurfaceGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--bg-secondary)" />
                <stop offset="100%" stopColor="var(--bg-tertiary)" />
              </radialGradient>
            </defs>

            {/* Subtle background disc */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius}
              fill="url(#mapSurfaceGrad)"
              opacity={0.3}
            />
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={1}
              strokeDasharray="4 6"
              opacity={0.4}
            />

            {/* Directed Interaction Links */}
            {interactionGraph.links.map((link, idx) => {
              const s = layout.seats.find((st) => st.id === link.sourceId);
              const t = layout.seats.find((st) => st.id === link.targetId);
              if (!s || !t) return null;

              const strokeWidth = Math.min(6, 1.5 + link.count * 0.8);
              const strokeColor = s.color || "#6366F1";
              const pathD = computeInteractionArc(
                { x: s.x, y: s.y },
                { x: t.x, y: t.y },
                center,
                { curvature: 0.52 }
              );
              const markerId = `map-arrow-${idx}`;

              return (
                <g key={`map-link-${link.sourceId}-${link.targetId}`} className="pointer-events-none">
                  <defs>
                    <marker
                      id={markerId}
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="4"
                      markerHeight="4"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 8 5 L 0 9 z" fill={strokeColor} opacity={0.8} />
                    </marker>
                  </defs>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={link.primaryStance === "CHALLENGE" ? "6 4" : undefined}
                    strokeLinecap="round"
                    strokeOpacity={0.7}
                    markerEnd={`url(#${markerId})`}
                  />
                </g>
              );
            })}
          </svg>

          {/* Center Medallion summary for Map */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center w-28 h-28 shadow-none">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              Network
            </span>
            <span className="text-xl font-bold font-mono text-[var(--text-primary)]">
              {interactionGraph.totalInteractions}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">Exchanges</span>
          </div>

          {/* Seated Nodes on Map */}
          {layout.seats.map((seat) => {
            const persona = findPersonaById(seat.id as PersonaId);
            if (!persona) return null;
            const nodeData = interactionGraph.nodes.find((n) => n.id === seat.id);

            return (
              <div
                key={`map-seat-${seat.id}`}
                style={{
                  left: `${(seat.x / TABLE_CONSTANTS.DESIGN_SIZE) * 100}%`,
                  top: `${(seat.y / TABLE_CONSTANTS.DESIGN_SIZE) * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPersona(persona);
                    onSelectPersona?.(persona);
                  }}
                  className={cn(
                    "relative flex items-center justify-center rounded-full cursor-pointer transition-all duration-200",
                    seat.isModerator
                      ? "w-12 h-12 opacity-50 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]"
                      : "w-14 h-14 bg-[var(--bg-secondary)] border-2 shadow-none hover:scale-105"
                  )}
                  style={{ borderColor: seat.color || "#3B82F6" }}
                  title={`${persona.name}: ${nodeData?.totalSpoken || 0} spoken, ${nodeData?.challengesInitiated || 0} challenges`}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: seat.color || "#3B82F6" }}
                  >
                    {seat.isModerator ? "M" : seat.name.charAt(0)}
                  </span>
                  {!seat.isModerator && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[var(--accent)] text-[var(--bg-primary)] rounded-full text-[9px] font-mono font-bold">
                      {nodeData?.totalSpoken || 0}
                    </span>
                  )}
                </button>
                <span className="mt-1 text-[10px] font-medium text-[var(--text-primary)] whitespace-nowrap">
                  {seat.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "matrix" && (
        /* ── PAIRWISE INTERACTION MATRIX VIEW (RT4 §5) ── */
        <div
          role="region"
          aria-label="The Council Interaction Matrix"
          className="w-full max-w-[640px] flex flex-col gap-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-x-auto"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">
              Pairwise Exchange Matrix (Rows: Speaker → Columns: Addressed)
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {interactionGraph.totalInteractions} total interactions
            </span>
          </div>

          <table role="grid" className="w-full text-xs text-center border-collapse">
            <thead>
              <tr>
                <th className="p-1 text-left text-[10px] font-mono text-[var(--text-muted)]">
                  From \ To
                </th>
                {COUNCIL_MEMBERS.map((m) => (
                  <th
                    key={`col-${m.id}`}
                    className="p-1 text-[10px] font-medium truncate max-w-[55px]"
                    style={{ color: m.colorHex }}
                    title={m.name}
                  >
                    {m.name.replace("The ", "").slice(0, 4)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COUNCIL_MEMBERS.map((rowMember) => (
                <tr key={`row-${rowMember.id}`} className="border-t border-[var(--border-subtle)]/40">
                  <td
                    className="p-1 text-left text-[10px] font-semibold truncate max-w-[65px]"
                    style={{ color: rowMember.colorHex }}
                    title={rowMember.name}
                  >
                    {rowMember.name.replace("The ", "")}
                  </td>
                  {COUNCIL_MEMBERS.map((colMember) => {
                    if (rowMember.id === colMember.id) {
                      return (
                        <td key={`cell-${rowMember.id}-${colMember.id}`} className="p-1 text-[var(--text-muted)] opacity-30 text-[10px]">
                          —
                        </td>
                      );
                    }
                    const cell = interactionGraph.matrix[rowMember.id]?.[colMember.id];
                    const count = cell?.count || 0;
                    const challenge = cell?.challengeCount || 0;
                    const agree = cell?.agreeCount || 0;

                    return (
                      <td
                        key={`cell-${rowMember.id}-${colMember.id}`}
                        className={cn(
                          "p-1 text-[10px] font-mono font-medium rounded transition-colors",
                          count > 0
                            ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold"
                            : "text-[var(--text-muted)] opacity-40"
                        )}
                        title={`${rowMember.name} → ${colMember.name}: ${count} exchanges (${challenge} challenges, ${agree} agrees)`}
                      >
                        {count > 0 ? (
                          <div className="flex items-center justify-center gap-0.5">
                            <span>{count}</span>
                            {challenge > agree ? (
                              <span className="text-[8px] text-[var(--status-urgent)]">⚡</span>
                            ) : agree > 0 ? (
                              <span className="text-[8px] text-[var(--status-low)]">✓</span>
                            ) : null}
                          </div>
                        ) : (
                          "0"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
            <span>⚡ Dominant Challenge</span>
            <span>✓ Dominant Agreement</span>
            <span>Click any seat to open profile</span>
          </div>
        </div>
      )}

      {viewMode === "list" && (
        /* ── ACCESSIBLE LIST VIEW TOGGLE (Alternative Deck) ── */
        <div
          role="region"
          aria-label="The Council Seating List View"
          className="w-full max-w-xl flex flex-col gap-2 p-2"
        >
          {layout.seats.map((seat) => {
            const persona = findPersonaById(seat.id as PersonaId);
            const state = seatStates[seat.id as PersonaId];
            const isSpeaking = currentSpeakerId === seat.id;

            return (
              <div
                key={seat.id}
                onClick={() => {
                  if (persona) {
                    setSelectedPersona(persona);
                    onSelectPersona?.(persona);
                  }
                }}
                className={cn(
                  "p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors",
                  isSpeaking && "ring-2 ring-[var(--accent)]"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: `${seat.color || "#3B82F6"}20`,
                      color: seat.color || "#3B82F6",
                    }}
                  >
                    {seat.isModerator ? "M" : seat.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                      {seat.name}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">{seat.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {state && !seat.isModerator && (
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {state.confidence}%
                    </span>
                  )}
                  {isSpeaking && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--status-low)]/10 text-[var(--status-low)]">
                      Speaking
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Docked Speaker Caption (R3: Replaces Floating Speech Bubble) */}
      {speakingSeat && lastSpeakerSnippet && status === "running" && phase !== "PHASE_5_FINAL_OUTPUT" && (
        <div
          role="region"
          aria-live="polite"
          className="w-full max-w-[640px] mt-3 p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
              style={{
                backgroundColor: `${speakingSeat.color || "#3B82F6"}20`,
                color: speakingSeat.color || "#3B82F6",
              }}
            >
              {speakingSeat.isModerator ? "M" : speakingSeat.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-[var(--text-primary)] text-xs">
                  {speakingSeat.name}
                </span>
                {activeInteraction?.stance && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                    {activeInteraction.stance}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-muted)] font-mono">speaking</span>
              </div>
              <p className="line-clamp-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                {lastSpeakerSnippet}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const p = findPersonaById(speakingSeat.id as PersonaId);
              if (p) {
                setSelectedPersona(p);
                onSelectPersona?.(p);
              }
            }}
            className="shrink-0 text-[11px] font-medium text-[var(--accent)] hover:underline whitespace-nowrap"
          >
            Open statement →
          </button>
        </div>
      )}

      {/* Docked Replay Scrubber Pill (Section 6) */}
      {totalReplaySteps && totalReplaySteps > 1 && replayStep !== undefined && onReplayStepChange && (
        <div className="mt-4">
          <ReplayScrubber
            totalSteps={totalReplaySteps}
            currentStep={replayStep}
            onStepChange={onReplayStepChange}
          />
        </div>
      )}

      {/* Persona Drawer Modal */}
      <PersonaDrawer
        persona={selectedPersona}
        isOpen={!!selectedPersona}
        onClose={() => setSelectedPersona(null)}
        confidence={
          selectedPersona && selectedPersona.id !== "moderator"
            ? trajectories[selectedPersona.id]?.finalConfidence ?? null
            : null
        }
        confidenceDelta={
          selectedPersona && selectedPersona.id !== "moderator"
            ? trajectories[selectedPersona.id]?.delta
            : undefined
        }
        trajectoryPoints={
          selectedPersona && selectedPersona.id !== "moderator"
            ? trajectories[selectedPersona.id]?.points
            : []
        }
        openingPosition={
          selectedPersona ? openingPositions[selectedPersona.id] : undefined
        }
        vote={selectedPersona ? ratificationVotes[selectedPersona.id] : undefined}
      />
    </div>
  );
};

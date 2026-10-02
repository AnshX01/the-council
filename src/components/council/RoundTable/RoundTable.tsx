/**
 * Origin: The Council Round Table v3 (Section 6)
 * Hero Circular Council Table:
 * - Moderator anchored at 12 o'clock (head of table)
 * - Tonal glass table disc with inner rim, tick marks, and speaker spotlight
 * - 9 seated personas with chair-back arcs, outward labels, and confidence rings
 * - Live SVG dialogue arcs with stance encoding and fading trails
 * - Center convergence / ratification medallion
 * - Dynamic collision-free speech bubble
 * - Post-deliberation interaction map toggle
 * - Replay scrubber pill
 * - Accessible List View toggle & roving tabindex keyboard navigation
 */

"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ALL_PERSONAS,
  MODERATOR,
  COUNCIL_MEMBERS,
  PersonaProfile,
  findPersonaById,
} from "@/lib/council/personas";
import {
  computeSeatLayout,
  computeSpeechBubbleAnchor,
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
  selectInteractionMap,
  InteractionPair,
} from "@/lib/ui/selectors";
import { List, CircleDot, Network } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"round" | "list">("round");
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [focusedSeatIndex, setFocusedSeatIndex] = useState<number>(0);
  const [arcTrail, setArcTrail] = useState<ArcTrailEntry[]>([]);
  const [showInteractionMap, setShowInteractionMap] = useState<boolean>(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => computeSeatLayout(STATIC_SEAT_PERSONAS, 640, 72), []);

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

  // Track arc trails (keep last 3 arcs with fading opacities)
  useEffect(() => {
    if (activeInteraction) {
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

  // Aggregate interaction map
  const interactionMap = useMemo(() => {
    return selectInteractionMap(allEvents);
  }, [allEvents]);

  // Listen for custom event to toggle list view
  useEffect(() => {
    const handleToggle = () => {
      setViewMode((v) => (v === "round" ? "list" : "round"));
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
      if (p) setSelectedPersona(p);
    }
  };

  const center = { x: layout.centerX, y: layout.centerY };
  const tableDiscRadius = layout.radius * 0.58; // ≈ 144px radius filled table

  // Active speaker speech bubble coordinates
  const speakingSeat = layout.seats.find((s) => s.id === currentSpeakerId);
  const bubbleAnchor = speakingSeat
    ? computeSpeechBubbleAnchor(speakingSeat, center, 640)
    : null;

  return (
    <div
      ref={stageRef}
      onKeyDown={handleKeyDown}
      className={cn("flex flex-col items-center select-none w-full", className)}
    >
      {/* Stage Header Controls (List View & Interaction Map) */}
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

        <div className="flex items-center gap-1">
          {status === "completed" && interactionMap.length > 0 && (
            <button
              onClick={() => setShowInteractionMap(!showInteractionMap)}
              className={cn(
                "p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors",
                showInteractionMap
                  ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                  : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Toggle interaction network map"
              aria-label="Toggle interaction network map"
            >
              <Network size={14} />
              <span className="hidden sm:inline text-[11px] font-medium">Network</span>
            </button>
          )}

          <button
            onClick={() => setViewMode(viewMode === "round" ? "list" : "round")}
            className="p-1.5 rounded-lg text-xs flex items-center gap-1.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Toggle between circular table and accessible list view"
            aria-label="Toggle list view"
          >
            {viewMode === "round" ? <List size={14} /> : <CircleDot size={14} />}
            <span className="hidden sm:inline text-[11px] font-medium">
              {viewMode === "round" ? "List View" : "Table View"}
            </span>
          </button>
        </div>
      </div>

      {viewMode === "round" ? (
        /* ── CIRCULAR ROUND TABLE STAGE (640x640 Vector Layout) ── */
        <div
          role="region"
          aria-label="The Council Round Table"
          className="relative w-full max-w-[640px] aspect-square flex items-center justify-center overflow-visible"
        >
          {/* Base SVG Canvas: Table Surface, Rim, Ticks, Spotlight & Arcs */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 640 640"
          >
            <defs>
              {/* Tonal Table Disc Radial Gradient */}
              <radialGradient id="tableSurfaceGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--bg-secondary)" />
                <stop offset="100%" stopColor="var(--bg-tertiary)" />
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

            {/* Table Surface Disc */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius}
              fill="url(#tableSurfaceGrad)"
            />

            {/* Inner Rim (1px edge at 6% opacity) */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={1}
            />

            {/* Faint Concentric Inner Ring at 0.40 R */}
            <circle
              cx={center.x}
              cy={center.y}
              r={tableDiscRadius * 0.4}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={1}
              strokeDasharray="4 6"
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
              const tickInner = tableDiscRadius - 5;
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
                  strokeOpacity={0.4}
                />
              );
            })}

            {/* Live Dialogue Arcs with Fading Trail */}
            {!showInteractionMap &&
              arcTrail.map((entry, idx) => {
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

            {/* Aggregated Interaction Network Map Overlay */}
            {showInteractionMap &&
              interactionMap.map((pair, pIdx) => {
                const s = layout.seats.find((st) => st.id === pair.speakerId);
                const t = layout.seats.find((st) => st.id === pair.targetId);
                if (!s || !t) return null;

                return (
                  <InteractionArc
                    key={`map-pair-${pIdx}`}
                    source={{ x: s.x, y: s.y }}
                    target={{ x: t.x, y: t.y }}
                    center={center}
                    stance={pair.challengeCount > pair.agreeCount ? "CHALLENGE" : "AGREE"}
                    speakerColor={s.color}
                    opacity={Math.min(1.0, 0.4 + pair.count * 0.15)}
                    isActive={false}
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

          {/* HTML Seated Nodes */}
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

          {/* Speaking Speech Bubble (Center-facing with 3-line clamp) */}
          {speakingSeat && bubbleAnchor && lastSpeakerSnippet && (
            <div
              style={{
                left: `${bubbleAnchor.x}px`,
                top: `${bubbleAnchor.y}px`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 max-w-[240px] pointer-events-auto animate-spring-scale"
            >
              <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] shadow-none">
                <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {speakingSeat.name}
                  </span>
                  <span>speaking</span>
                </div>
                <p className="line-clamp-3 leading-relaxed text-[var(--text-secondary)]">
                  {lastSpeakerSnippet}
                </p>
                <button
                  onClick={() => {
                    const p = findPersonaById(speakingSeat.id as PersonaId);
                    if (p) setSelectedPersona(p);
                  }}
                  className="mt-1 text-[10px] font-medium text-[var(--accent)] hover:underline"
                >
                  Open statement →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
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
                onClick={() => persona && setSelectedPersona(persona)}
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

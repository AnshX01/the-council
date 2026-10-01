'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ALL_PERSONAS,
  MODERATOR,
  COUNCIL_MEMBERS,
  PersonaProfile,
  getPersonaById,
  findPersonaById,
} from '@/lib/council/personas';
import { computeSeatLayout, SeatPersona } from '@/lib/council/geometry';
import { SeatNode } from './SeatNode';
import { InteractionArc, InteractionStance } from './InteractionArc';
import { VerdictSeal } from './VerdictSeal';
import { PersonaDrawer } from './PersonaDrawer';
import { ReplayScrubber } from './ReplayScrubber';
import { PersonaId } from '@/types/persona';
import {
  DeliberationPhase,
  OpeningPosition,
  CrossExamRound,
  RatificationVote,
} from '@/types/session';
import { LayoutGrid, CircleDot, Volume2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

export interface ActiveInteraction {
  sourceId: PersonaId;
  targetId: PersonaId;
  stance: InteractionStance;
}

export interface RoundTableProps {
  memberStatuses?: Record<PersonaId, 'active' | 'unavailable'>;
  currentSpeakerId?: PersonaId;
  activeInteraction?: ActiveInteraction | null;
  openingPositions?: Partial<Record<PersonaId, OpeningPosition>>;
  crossExamRounds?: CrossExamRound[];
  ratificationVotes?: Partial<Record<PersonaId, RatificationVote>>;
  phase?: DeliberationPhase;
  convergenceScore?: number;
  isUnanimous?: boolean;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'aborted';
  onSelectPersona?: (persona: PersonaProfile) => void;
  onViewVerdict?: () => void;
  replayStep?: number;
  totalReplaySteps?: number;
  onReplayStepChange?: (step: number) => void;
  className?: string;
}

export const RoundTable: React.FC<RoundTableProps> = ({
  memberStatuses = {} as Record<PersonaId, 'active' | 'unavailable'>,
  currentSpeakerId,
  activeInteraction,
  openingPositions = {},
  crossExamRounds = [],
  ratificationVotes = {},
  phase = 'PHASE_0_FRAMING',
  convergenceScore = 0,
  isUnanimous = false,
  status = 'idle',
  onSelectPersona,
  onViewVerdict,
  replayStep,
  totalReplaySteps,
  onReplayStepChange,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'round' | 'list'>('round');
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [focusedSeatIndex, setFocusedSeatIndex] = useState<number>(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // Convert personas for geometry calculations
  const seatPersonas: SeatPersona[] = ALL_PERSONAS.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.id === 'moderator' ? 'moderator' : 'voting',
    color: p.colorHex,
  }));

  // Standard table size 580x580 with 68px padding for seat nodes
  const layout = computeSeatLayout(seatPersonas, 580, 68);

  const handleSeatClick = (persona: PersonaProfile) => {
    setSelectedPersona(persona);
    onSelectPersona?.(persona);
  };

  // Keyboard navigation for seats (Arrow keys rotate around table)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalSeats = layout.seats.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSeatIndex((prev) => (prev + 1) % totalSeats);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSeatIndex((prev) => (prev - 1 + totalSeats) % totalSeats);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const seat = layout.seats[focusedSeatIndex];
      const p = findPersonaById(seat.id);
      if (p) handleSeatClick(p);
    }
  };

  // Helper to extract persona current values
  const getPersonaData = (id: PersonaId) => {
    const isUnavailable = memberStatuses[id] === 'unavailable';
    const latestRound = crossExamRounds[crossExamRounds.length - 1];
    const turn = latestRound?.turns[id];
    const opening = openingPositions[id];

    let confidence = turn?.updatedConfidence ?? opening?.confidenceScore ?? null;
    let confidenceDelta: number | null = null;
    if (turn?.updatedConfidence !== undefined && opening?.confidenceScore !== undefined) {
      confidenceDelta = turn.updatedConfidence - opening.confidenceScore;
    }
    const vote = ratificationVotes[id];

    // Statements made in session
    const statements: Array<{
      phase: string;
      round?: number;
      text: string;
      stance?: string;
      confidence?: number;
    }> = [];

    if (opening) {
      statements.push({
        phase: 'Opening Position',
        text: opening.positionSummary,
        confidence: opening.confidenceScore,
      });
    }

    crossExamRounds.forEach((round, rIndex) => {
      const rTurn = round.turns[id];
      if (rTurn) {
        statements.push({
          phase: 'Cross-Examination',
          round: rIndex + 1,
          text: rTurn.updatedPosition,
          confidence: rTurn.updatedConfidence,
          stance: rTurn.responses?.[0]?.action,
        });
      }
    });

    return { isUnavailable, confidence, confidenceDelta, vote, opening, statements };
  };

  // Locate coordinates for active interaction arc
  let sourceCoords = null;
  let targetCoords = null;
  let speakerColor = '#6366F1';

  if (activeInteraction) {
    const sSeat = layout.seats.find((s) => s.id === activeInteraction.sourceId);
    const tSeat = layout.seats.find((s) => s.id === activeInteraction.targetId);
    if (sSeat && tSeat) {
      sourceCoords = { x: sSeat.x, y: sSeat.y };
      targetCoords = { x: tSeat.x, y: tSeat.y };
      const sProfile = findPersonaById(sSeat.id);
      if (sProfile) speakerColor = sProfile.colorHex;
    }
  }

  const selectedData = selectedPersona ? getPersonaData(selectedPersona.id) : null;

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* View Switcher Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            Deliberation Chamber
          </span>
          <Badge variant="neutral" size="xs">
            9 Members
          </Badge>
        </div>

        {/* View Mode Toggle Button */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
          <button
            type="button"
            onClick={() => setViewMode('round')}
            aria-label="Circular Round Table view"
            aria-pressed={viewMode === 'round'}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'round'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chamber</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="Accessible Grid List view"
            aria-pressed={viewMode === 'list'}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'round' ? (
        <div
          ref={tableRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="region"
          aria-label="Circular Round Table deliberation diagram. Use arrow keys to navigate between seats, and Enter to view persona details."
          className="relative w-full max-w-[580px] aspect-square flex items-center justify-center rounded-full glass-panel-subtle p-6 overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {/* Subtle Chamber Inner Ring */}
          <div
            className="absolute rounded-full border border-black/5 dark:border-white/10 pointer-events-none"
            style={{
              width: `${layout.radius * 2}px`,
              height: `${layout.radius * 2}px`,
            }}
          />

          {/* Table Background Radial Wash */}
          <div
            className="absolute rounded-full pointer-events-none opacity-40"
            style={{
              width: `${layout.radius * 1.5}px`,
              height: `${layout.radius * 1.5}px`,
              background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            }}
          />

          {/* SVG Overlay for Interaction Arcs */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
          >
            {sourceCoords && targetCoords && activeInteraction && (
              <InteractionArc
                source={sourceCoords}
                target={targetCoords}
                center={{ x: layout.centerX, y: layout.centerY }}
                stance={activeInteraction.stance}
                speakerColor={speakerColor}
                isActive={true}
              />
            )}
          </svg>

          {/* Center Medallion: VerdictSeal */}
          <div className="absolute z-10">
            <VerdictSeal
              phase={phase}
              convergenceScore={convergenceScore}
              isUnanimous={isUnanimous}
              status={status}
              onViewVerdict={onViewVerdict}
              size={144}
            />
          </div>

          {/* 9 Seated Members (Moderator at 12 o'clock, 8 clockwise) */}
          {layout.seats.map((seat, index) => {
            const profile = findPersonaById(seat.id);
            if (!profile) return null;
            const data = getPersonaData(profile.id);
            const isSpeaking = currentSpeakerId === profile.id;
            const isSelected = selectedPersona?.id === profile.id;

            return (
              <SeatNode
                key={seat.id}
                persona={profile}
                x={seat.x}
                y={seat.y}
                seatRadius={layout.seatRadius}
                isModerator={seat.isModerator}
                isSpeaking={isSpeaking}
                isUnavailable={data.isUnavailable}
                confidence={data.confidence}
                confidenceDelta={data.confidenceDelta}
                vote={data.vote}
                isSelected={isSelected}
                focused={focusedSeatIndex === index}
                onClick={() => handleSeatClick(profile)}
                onFocus={() => setFocusedSeatIndex(index)}
              />
            );
          })}
        </div>
      ) : (
        /* Accessible List View */
        <div className="w-full space-y-3">
          {/* Moderator row */}
          <GlassCard
            onClick={() => handleSeatClick(MODERATOR)}
            role="button"
            tabIndex={0}
            interactive
            padded="sm"
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold">
                M
              </div>
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {MODERATOR.name}
                </span>
                <p className="text-xs text-gray-500">{MODERATOR.title}</p>
              </div>
            </div>
            <Badge variant="neutral" size="xs">
              Chair (Non-Voting)
            </Badge>
          </GlassCard>

          {/* 8 Voting Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COUNCIL_MEMBERS.map((member) => {
              const data = getPersonaData(member.id);
              const isSpeaking = currentSpeakerId === member.id;

              return (
                <GlassCard
                  key={member.id}
                  onClick={() => handleSeatClick(member)}
                  role="button"
                  tabIndex={0}
                  interactive={!data.isUnavailable}
                  padded="sm"
                  className={`cursor-pointer ${
                    isSpeaking ? 'ring-2 ring-indigo-500/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: member.colorHex }}>
                      {member.name}
                    </span>
                    {data.confidence !== null && (
                      <span className="text-xs font-mono font-semibold">
                        {data.confidence}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                    {data.opening?.positionSummary || 'Awaiting position...'}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Replay Scrubber Control (Optional) */}
      {totalReplaySteps !== undefined && totalReplaySteps > 1 && onReplayStepChange && (
        <div className="w-full max-w-xl mt-6">
          <ReplayScrubber
            totalSteps={totalReplaySteps}
            currentStep={replayStep ?? 0}
            onStepChange={onReplayStepChange}
          />
        </div>
      )}

      {/* Persona Detail Slide-out Drawer */}
      <PersonaDrawer
        persona={selectedPersona}
        isOpen={Boolean(selectedPersona)}
        onClose={() => setSelectedPersona(null)}
        confidence={selectedData?.confidence ?? null}
        openingPosition={selectedData?.opening}
        vote={selectedData?.vote}
        statements={selectedData?.statements}
      />
    </div>
  );
};

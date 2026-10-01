'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { CouncilSSEEvent } from '@/types/events';
import {
  DeliberationSession,
  FinalVerdict,
  OpeningPosition,
  CrossExamRound,
  ConvergenceDraft,
  RatificationVote,
  ShiftRecord,
} from '@/types/session';
import { PersonaProfile, PersonaId } from '@/types/persona';
import { findPersonaById } from '@/lib/council/personas';
import { PhaseTracker } from '@/components/PhaseTracker';
import { ConsensusMeter } from '@/components/ConsensusMeter';
import { CouncilTable } from '@/components/CouncilTable';
import { DebateFeed } from '@/components/DebateFeed';
import { FinalVerdictCard } from '@/components/FinalVerdictCard';
import { PersonaDetailModal } from '@/components/PersonaDetailModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Loader2, AlertCircle, Compass, Radio } from 'lucide-react';

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);

  const [session, setSession] = useState<DeliberationSession | null>(null);
  const [events, setEvents] = useState<CouncilSSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<PersonaId | undefined>();
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionRef = useRef<DeliberationSession | null>(null);
  sessionRef.current = session;

  // 1. Initial Snapshot Fetch
  useEffect(() => {
    let isCancelled = false;

    async function fetchInitialSnapshot(retries = 3) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          if (res.status === 404 && retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 350));
            if (!isCancelled) {
              return fetchInitialSnapshot(retries - 1);
            }
          }
          if (res.status === 404) throw new Error('Deliberation session not found.');
          throw new Error('Failed to load session details.');
        }
        const data = await res.json();
        if (!isCancelled) {
          setSession(data.session);
          setEvents((prev) => {
            const initialList: CouncilSSEEvent[] = data.events || [];
            const merged = [...prev];
            for (const item of initialList) {
              const exists = merged.some(
                (m) =>
                  (item.id && m.id === item.id) ||
                  (m.timestamp === item.timestamp &&
                    m.event === item.event &&
                    JSON.stringify(m.payload) === JSON.stringify(item.payload))
              );
              if (!exists) merged.push(item);
            }
            return merged;
          });
        }
      } catch (err: any) {
        if (!isCancelled) setError(err.message);
      }
    }

    fetchInitialSnapshot();

    return () => {
      isCancelled = true;
    };
  }, [sessionId]);

  // 2. Real-Time SSE Stream Connection
  useEffect(() => {
    if (!sessionId) return;

    let isCancelled = false;

    function connectSSE() {
      const eventSource = new EventSource(`/api/sessions/${sessionId}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isCancelled) setIsConnected(true);
      };

      eventSource.onerror = () => {
        if (!isCancelled) {
          setIsConnected(false);
          // If session is already concluded, close to avoid browser reconnect retry loop
          if (sessionRef.current?.finalVerdict || sessionRef.current?.currentPhase === 'PHASE_5_FINAL_OUTPUT') {
            eventSource.close();
          }
        }
      };

      // Listen for all council events
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

      for (const type of eventTypes) {
        eventSource.addEventListener(type, (e: MessageEvent) => {
          try {
            const parsedEvent: CouncilSSEEvent = JSON.parse(e.data);
            handleIncomingEvent(parsedEvent);
          } catch (err) {
            console.error('Failed to parse SSE event:', err);
          }
        });
      }
    }

    connectSSE();

    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId]);

  // Reactive state updates from incoming SSE events
  const handleIncomingEvent = (event: CouncilSSEEvent) => {
    setEvents((prev) => {
      const exists = prev.some(
        (e) =>
          (event.id && e.id === event.id) ||
          (e.timestamp === event.timestamp &&
            e.event === event.event &&
            JSON.stringify(e.payload) === JSON.stringify(event.payload))
      );
      if (exists) return prev;
      return [...prev, event];
    });

    if (event.event === 'done') {
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    } else if (event.event === 'phase_started') {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              currentPhase: event.payload.phase,
            }
          : null
      );
    } else if (event.event === 'persona_message') {
      setCurrentSpeaker(event.payload.personaId);
      // Reset speaker indicator after 4 seconds
      setTimeout(() => {
        setCurrentSpeaker((curr) =>
          curr === event.payload.personaId ? undefined : curr
        );
      }, 4000);
    } else if (event.event === 'moderator_draft') {
      setCurrentSpeaker('moderator');
      setTimeout(() => setCurrentSpeaker(undefined), 3500);
    } else if (event.event === 'persona_unavailable') {
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          memberStatuses: {
            ...prev.memberStatuses,
            [event.payload.personaId]: 'unavailable',
          },
        };
      });
    } else if (event.event === 'final_verdict') {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              currentPhase: 'PHASE_5_FINAL_OUTPUT',
              finalVerdict: event.payload,
            }
          : null
      );
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    } else if (event.event === 'session_error') {
      setError(event.payload.message);
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  // Extract accumulated artifacts from events
  const getAccumulatedState = () => {
    const openings: Partial<Record<PersonaId, OpeningPosition>> =
      session?.openingPositions ? { ...session.openingPositions } : {};
    const rounds: CrossExamRound[] = session?.crossExamRounds ? [...session.crossExamRounds] : [];
    const drafts: ConvergenceDraft[] = session?.convergenceDrafts ? [...session.convergenceDrafts] : [];
    const votes: Partial<Record<PersonaId, RatificationVote>> = {};
    const shifts: ShiftRecord[] = session?.positionShiftHistory ? [...session.positionShiftHistory] : [];
    let latestScore = 20;

    for (const evt of events) {
      if (evt.event === 'moderator_draft') {
        latestScore = evt.payload.alignmentScore;
        const exists = drafts.some((d) => d.roundNumber === evt.payload.draftRound);
        if (!exists) {
          drafts.push({
            roundNumber: evt.payload.draftRound,
            draftConsensusText: evt.payload.draftConsensusText,
            coreAgreements: evt.payload.keyAlignmentPoints || [],
            remainingDisagreements: evt.payload.remainingDisagreements,
            alignmentScore: evt.payload.alignmentScore,
            varianceScore: evt.payload.varianceScore,
            memberAgreementScores: {},
            outcomeConsensusReached: Boolean(evt.payload.outcomeConsensusReached),
            timestamp: evt.timestamp,
          });
        }
      } else if (evt.event === 'ratification_vote') {
        votes[evt.payload.personaId] = {
          personaId: evt.payload.personaId,
          cycleNumber: evt.payload.cycleNumber,
          vote: evt.payload.vote,
          amendmentText: evt.payload.amendmentText,
          objectionReason: evt.payload.objectionReason,
          closingComment: evt.payload.closingComment,
          timestamp: evt.timestamp,
        };
      } else if (evt.event === 'position_update') {
        const exists = shifts.some(
          (s) =>
            s.personaId === evt.payload.personaId &&
            s.roundNumber === evt.payload.roundNumber
        );
        if (!exists) {
          shifts.push({
            personaId: evt.payload.personaId,
            roundNumber: evt.payload.roundNumber,
            previousPosition: evt.payload.previousPosition,
            newPosition: evt.payload.newPosition,
            previousConfidence: evt.payload.previousConfidence,
            newConfidence: evt.payload.newConfidence,
            deltaConfidence: evt.payload.deltaConfidence,
            catalystPersonaIds: evt.payload.catalystPersonaIds,
            shiftRationale: evt.payload.shiftRationale,
            timestamp: evt.timestamp,
          });
        }
      }
    }

    return { openings, rounds, drafts, votes, shifts, latestScore };
  };

  if (error) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto animate-fade-in">
        <GlassCard padded="lg" className="!rounded-[20px] space-y-4">
          <div className="w-12 h-12 rounded-[14px] bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-500/25">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-gray-950 dark:text-gray-50">
            Deliberation Error
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-[12px] bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Chamber Entrance</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4 animate-fade-in">
        <GlassCard padded="lg" className="!rounded-[20px] space-y-4">
          <div className="w-12 h-12 rounded-[14px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/25">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-gray-950 dark:text-gray-50">
              Convening Chamber
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
              Seating personas & initializing deliberation protocol...
            </p>
          </div>
          {/* Skeleton loader track */}
          <div className="w-full h-2 rounded-full skeleton-shimmer mt-4" />
        </GlassCard>
      </div>
    );
  }

  const { openings, rounds, drafts, votes, shifts, latestScore } = getAccumulatedState();
  const isConcluded = session.currentPhase === 'PHASE_5_FINAL_OUTPUT' && session.finalVerdict;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Session Breadcrumb & Status Bar */}
      <GlassCard
        padded="sm"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 !rounded-[16px]"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-[10px] border border-gray-200/80 dark:border-white/10 text-gray-500 hover:text-gray-950 dark:hover:text-white bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
            title="Return to entrance"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 block leading-tight">
              Session ID: {session.sessionId.slice(0, 18)}...
            </span>
            <h1 className="font-serif font-bold text-base sm:text-lg text-gray-950 dark:text-gray-50 line-clamp-1 leading-snug">
              &ldquo;{session.rawQuery}&rdquo;
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Badge
            variant={isConnected ? 'success' : 'warning'}
            size="sm"
            dot
            icon={<Radio className="w-3 h-3" />}
          >
            {isConnected ? 'Live Chamber Stream' : 'Syncing'}
          </Badge>
        </div>
      </GlassCard>

      {/* Phase Tracker */}
      <PhaseTracker
        currentPhase={session.currentPhase}
        currentRound={session.currentCrossExamRound}
        maxRounds={session.options.maxCrossExamRounds}
        currentCycle={session.currentRatificationCycle}
      />

      {/* Final Verdict Card (prominently placed when reached) */}
      {isConcluded && session.finalVerdict && (
        <FinalVerdictCard verdict={session.finalVerdict} query={session.rawQuery} />
      )}

      {/* Council Table Grid */}
      <section aria-label="The Council Chamber">
        <CouncilTable
          memberStatuses={session.memberStatuses}
          currentSpeakerId={currentSpeaker}
          openingPositions={openings}
          crossExamRounds={rounds}
          ratificationVotes={votes}
          onSelectPersona={(persona) => setSelectedPersona(persona)}
        />
      </section>

      {/* Convergence Analytics & Transcript Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Consensus Meter & Framing */}
        <div className="lg:col-span-1 space-y-4">
          <ConsensusMeter score={latestScore} history={drafts} />

          {/* Framing Card */}
          {session.framing && (
            <GlassCard padded="md" className="!rounded-[16px] text-xs space-y-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <h4 className="font-serif font-bold text-gray-950 dark:text-gray-50">
                  Neutral Framing Boundaries
                </h4>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">
                {session.framing.restatedQuestion}
              </p>
              <div className="space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/10">
                <span className="font-semibold block text-gray-800 dark:text-gray-200">
                  Decision Vectors:
                </span>
                <ul className="list-disc pl-4 space-y-1">
                  {session.framing.coreDecisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column: Live Debate Transcript */}
        <div className="lg:col-span-2">
          <DebateFeed
            events={events}
            onSelectPersona={(id) => setSelectedPersona(findPersonaById(id) ?? null)}
          />
        </div>
      </div>

      {/* Persona Detail Modal */}
      {selectedPersona && (
        <PersonaDetailModal
          persona={selectedPersona}
          openingPosition={openings[selectedPersona.id]}
          crossExamRounds={rounds}
          shiftHistory={shifts}
          ratificationVote={votes[selectedPersona.id]}
          onClose={() => setSelectedPersona(null)}
        />
      )}
    </div>
  );
}

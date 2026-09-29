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
import { getPersonaById } from '@/lib/council/personas';
import { PhaseTracker } from '@/components/PhaseTracker';
import { ConsensusMeter } from '@/components/ConsensusMeter';
import { CouncilTable } from '@/components/CouncilTable';
import { DebateFeed } from '@/components/DebateFeed';
import { FinalVerdictCard } from '@/components/FinalVerdictCard';
import { PersonaDetailModal } from '@/components/PersonaDetailModal';
import { ArrowLeft, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

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
      // Close EventSource immediately to prevent browser reconnection loop
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
      <div className="py-16 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Deliberation Error
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-smooth"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Chamber Entrance</span>
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
        <p className="text-xs text-gray-500 font-mono tracking-wider uppercase">
          Initializing Chamber & Seating Personas...
        </p>
      </div>
    );
  }

  const { openings, rounds, drafts, votes, shifts, latestScore } = getAccumulatedState();
  const isConcluded = session.currentPhase === 'PHASE_5_FINAL_OUTPUT' && session.finalVerdict;

  return (
    <div className="space-y-6">
      {/* Session Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200/60 dark:border-gray-800/60 gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-smooth"
            title="Return to entrance"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
              Session ID: {session.sessionId.slice(0, 18)}...
            </span>
            <h1 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 line-clamp-1">
              &ldquo;{session.rawQuery}&rdquo;
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border ${
              isConnected
                ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{isConnected ? 'Live Chamber Stream' : 'Syncing'}</span>
          </span>
        </div>
      </div>

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
            <div className="p-4 rounded-xl border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/40 text-xs">
              <h4 className="font-serif font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Neutral Framing Boundaries
              </h4>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3 italic">
                {session.framing.restatedQuestion}
              </p>
              <div className="space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-semibold block text-gray-700 dark:text-gray-300">
                  Decision Vectors:
                </span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {session.framing.coreDecisions.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Debate Transcript */}
        <div className="lg:col-span-2">
          <DebateFeed
            events={events}
            onSelectPersona={(id) => setSelectedPersona(getPersonaById(id))}
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

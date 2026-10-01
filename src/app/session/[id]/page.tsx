'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CouncilSSEEvent } from '@/types/events';
import {
  DeliberationSession,
  FinalVerdict,
  OpeningPosition,
  CrossExamRound,
  ConvergenceDraft,
  RatificationVote,
  ShiftRecord,
  DeliberationPhase,
} from '@/types/session';
import { PersonaProfile, PersonaId } from '@/types/persona';
import { findPersonaById } from '@/lib/council/personas';
import { RoundTable, ActiveInteraction } from '@/components/council/RoundTable/RoundTable';
import { PhaseStepper } from '@/components/council/PhaseStepper';
import { TranscriptStream, TranscriptEvent } from '@/components/council/TranscriptStream';
import { TrajectoryChart } from '@/components/council/TrajectoryChart';
import { FinalVerdictCard } from '@/components/FinalVerdictCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Radio,
  Download,
  RotateCcw,
  StopCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [session, setSession] = useState<DeliberationSession | null>(null);
  const [events, setEvents] = useState<CouncilSSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<PersonaId | undefined>();
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [replayStep, setReplayStep] = useState<number>(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionRef = useRef<DeliberationSession | null>(null);
  sessionRef.current = session;

  // 1. Initial Snapshot Fetch
  useEffect(() => {
    let isCancelled = false;

    async function fetchInitialSnapshot(retries = 3) {
      try {
        const res = await fetch(`/api/v1/sessions/${sessionId}`);
        if (!res.ok) {
          // Fallback to legacy route if needed
          const legacyRes = await fetch(`/api/sessions/${sessionId}`);
          if (!legacyRes.ok) {
            if (legacyRes.status === 404 && retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 350));
              if (!isCancelled) return fetchInitialSnapshot(retries - 1);
            }
            if (legacyRes.status === 404) throw new Error('Deliberation session not found.');
            throw new Error('Failed to load session details.');
          }
          const legacyData = await legacyRes.json();
          if (!isCancelled) {
            setSession(legacyData.session);
            setEvents(legacyData.events || []);
          }
          return;
        }

        const data = await res.json();
        const sessionPayload = data.data?.session || data.session;
        const eventsPayload = data.data?.events || data.events || [];
        if (!isCancelled && sessionPayload) {
          setSession(sessionPayload);
          setEvents(eventsPayload);
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
      // Use API v1 stream with resumable after sequence
      const streamUrl = `/api/v1/sessions/${sessionId}/stream`;
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isCancelled) setIsConnected(true);
      };

      eventSource.onerror = () => {
        if (!isCancelled) {
          setIsConnected(false);
          if (sessionRef.current?.finalVerdict || sessionRef.current?.currentPhase === 'PHASE_5_FINAL_OUTPUT') {
            eventSource.close();
          }
        }
      };

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
            const raw = JSON.parse(e.data);
            const parsedEvent: CouncilSSEEvent =
              raw && raw.event && raw.payload !== undefined
                ? raw
                : {
                    id: e.lastEventId || undefined,
                    seq: e.lastEventId ? Number(e.lastEventId) : undefined,
                    event: type as any,
                    sessionId,
                    timestamp: new Date().toISOString(),
                    payload: raw,
                  };
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

  // Handle incoming event reactively
  const handleIncomingEvent = (event: CouncilSSEEvent) => {
    setEvents((prev) => {
      const exists = prev.some(
        (e: any) =>
          (event.id && e.id === event.id) ||
          (e.seq !== undefined && (event as any).seq !== undefined && e.seq === (event as any).seq)
      );
      if (exists) return prev;
      return [...prev, event];
    });

    if (event.event === 'done') {
      setIsConnected(false);
      eventSourceRef.current?.close();
    } else if (event.event === 'phase_started') {
      setSession((prev) => (prev ? { ...prev, currentPhase: event.payload.phase } : null));
    } else if (event.event === 'persona_message') {
      setCurrentSpeaker(event.payload.personaId);

      // Check if this turn has a target response for interaction arc
      if (event.payload.targetPersonaId && event.payload.action) {
        setActiveInteraction({
          sourceId: event.payload.personaId,
          targetId: event.payload.targetPersonaId,
          stance: event.payload.action,
        });
      }

      setTimeout(() => {
        setCurrentSpeaker((curr) => (curr === event.payload.personaId ? undefined : curr));
        setActiveInteraction(null);
      }, 4500);
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
      eventSourceRef.current?.close();
    } else if (event.event === 'session_error') {
      setError(event.payload.message);
      setIsConnected(false);
      eventSourceRef.current?.close();
    }
  };

  // Extract accumulated artifacts from events
  const getAccumulatedState = () => {
    const openings: Partial<Record<PersonaId, OpeningPosition>> = session?.openingPositions
      ? { ...session.openingPositions }
      : {};
    const rounds: CrossExamRound[] = session?.crossExamRounds ? [...session.crossExamRounds] : [];
    const drafts: ConvergenceDraft[] = session?.convergenceDrafts ? [...session.convergenceDrafts] : [];
    const votes: Partial<Record<PersonaId, RatificationVote>> = {};
    const shifts: ShiftRecord[] = session?.positionShiftHistory ? [...session.positionShiftHistory] : [];
    let latestScore = 20;

    for (const evt of events) {
      if (evt.event === 'persona_message' && evt.payload.phase === 'PHASE_1_OPENING') {
        openings[evt.payload.personaId] = {
          personaId: evt.payload.personaId,
          positionSummary: evt.payload.content,
          detailedReasoning: evt.payload.content,
          confidenceScore: evt.payload.confidenceScore ?? 75,
          falsificationCondition: '',
          timestamp: evt.timestamp,
        };
      } else if (evt.event === 'moderator_draft') {
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
          (s) => s.personaId === evt.payload.personaId && s.roundNumber === evt.payload.roundNumber
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

  // Convert events to transcript items
  const transcriptEvents: TranscriptEvent[] = events.map((ev, index) => {
    let summary = '';
    let fullText = '';
    let personaId = 'moderator';
    let confidence: number | undefined;
    let stance: any;
    let targetPersonaId: string | undefined;

    if (ev.event === 'phase_started') {
      summary = `Initiated ${ev.payload.phase.replace(/_/g, ' ')}`;
      personaId = 'moderator';
    } else if (ev.event === 'persona_message') {
      const p = ev.payload as any;
      personaId = p.personaId;
      summary = p.content || p.statement || p.summary || '';
      fullText = p.reasoning || summary;
      confidence = p.confidenceScore ?? p.confidence;
      stance = p.action;
      targetPersonaId = p.targetPersonaId;
    } else if (ev.event === 'moderator_draft') {
      personaId = 'moderator';
      summary = `Draft Synthesis Round ${ev.payload.draftRound}: ${ev.payload.draftConsensusText}`;
      fullText = ev.payload.draftConsensusText;
    } else if (ev.event === 'ratification_vote') {
      personaId = ev.payload.personaId;
      summary = `Vote: ${ev.payload.vote}. ${ev.payload.closingComment || ''}`;
      fullText = ev.payload.amendmentText || ev.payload.objectionReason || summary;
    } else if (ev.event === 'final_verdict') {
      personaId = 'moderator';
      summary = `Verdict reached: ${ev.payload.verdictOneLiner || ev.payload.actionableConclusion}`;
      fullText = ev.payload.actionableConclusion;
    } else {
      summary = `${ev.event}`;
    }

    return {
      id: ev.id || `ev-${index}`,
      seq: ev.seq || index + 1,
      personaId,
      phase: ((ev.payload as any)?.phase as string) || 'Deliberation',
      type: ev.event,
      timestamp: ev.timestamp,
      summary,
      fullText,
      confidence,
      stance,
      targetPersonaId,
    };
  });

  const handleCancelSession = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast({
          type: 'info',
          title: 'Deliberation Stopped',
          description: 'The background runner has cleanly terminated execution.',
        });
        setIsConnected(false);
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Cancellation Failed', description: err.message });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRerunSession = async () => {
    setIsRerunning(true);
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/rerun`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast({
          type: 'success',
          title: 'Deliberation Rerun Initiated',
          description: `Convening new chamber session #${data.data?.newSessionId?.slice(0, 8)}...`,
        });
        router.push(`/c/${data.data?.newSessionId}`);
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Rerun Failed', description: err.message });
    } finally {
      setIsRerunning(false);
    }
  };

  const handleExport = (format: 'markdown' | 'json' | 'text') => {
    window.open(`/api/v1/sessions/${sessionId}/export?format=${format}`, '_blank');
    setShowExportMenu(false);
  };

  if (error) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto animate-fade-in">
        <GlassCard padded="lg" className="!rounded-[20px] space-y-4">
          <div className="w-12 h-12 rounded-[14px] bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-500/25">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-gray-50">
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
            <h3 className="font-bold text-base text-gray-950 dark:text-gray-50">
              Convening Chamber
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
              Seating personas & initializing deliberation protocol...
            </p>
          </div>
          <div className="w-full h-2 rounded-full skeleton-shimmer mt-4" />
        </GlassCard>
      </div>
    );
  }

  const { openings, rounds, drafts, votes, shifts, latestScore } = getAccumulatedState();
  const sessionIdStr = session.sessionId || (session as any).id || sessionId;
  const rawQueryStr = session.rawQuery || (session as any).query || '';
  const currentPhase = session.currentPhase || (session as any).current_phase || 'PHASE_0_FRAMING';
  const finalVerdict = session.finalVerdict || (session as any).verdict_payload || null;
  const isConcluded =
    currentPhase === 'PHASE_5_FINAL_OUTPUT' ||
    session.status === 'completed' ||
    (session as any).status === 'COMPLETED' ||
    Boolean(finalVerdict);
  const isUnanimous = finalVerdict?.isUnanimous ?? false;
  const isRunning =
    !isConcluded &&
    (isConnected || session.status === 'running' || (session as any).status === 'RUNNING');
  const memberStatuses = session.memberStatuses || {
    skeptic: 'active',
    optimist: 'active',
    ethicist: 'active',
    pragmatist: 'active',
    systems_thinker: 'active',
    historian: 'active',
    humanist: 'active',
    contrarian: 'active',
    moderator: 'active',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Session Breadcrumb & Actions Bar */}
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
              Session #{sessionIdStr ? sessionIdStr.slice(0, 10) : ''}
            </span>
            <h1 className="font-bold text-base sm:text-lg text-gray-950 dark:text-gray-50 line-clamp-1 leading-snug">
              &ldquo;{rawQueryStr}&rdquo;
            </h1>
          </div>
        </div>

        {/* Action Controls & Stream Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Badge
            variant={isRunning ? 'success' : isConcluded ? 'neutral' : 'warning'}
            size="sm"
            dot
            icon={<Radio className="w-3 h-3" />}
          >
            {isRunning ? 'Chamber Active' : isConcluded ? 'Concluded' : 'Paused'}
          </Badge>

          {/* Cancel button if running */}
          {isRunning && (
            <Button
              size="xs"
              variant="danger"
              isLoading={isCancelling}
              onClick={handleCancelSession}
              leftIcon={<StopCircle className="w-3.5 h-3.5" />}
            >
              Cancel
            </Button>
          )}

          {/* Rerun button */}
          <Button
            size="xs"
            variant="secondary"
            isLoading={isRerunning}
            onClick={handleRerunSession}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Rerun
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              size="xs"
              variant="glass"
              onClick={() => setShowExportMenu(!showExportMenu)}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              rightIcon={<ChevronDown className="w-3 h-3 ml-0.5" />}
            >
              Export
            </Button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1 w-36 glass-panel-elevated shadow-xl rounded-xl p-1 z-30 space-y-0.5 border border-white/20 dark:border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleExport('markdown')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200"
                >
                  Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200"
                >
                  JSON (.json)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('text')}
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200"
                >
                  Plain Text (.txt)
                </button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Phase Stepper */}
      <PhaseStepper currentPhase={currentPhase} />

      {/* Final Verdict Card (prominently placed when reached) */}
      {isConcluded && finalVerdict && (
        <FinalVerdictCard verdict={finalVerdict} query={rawQueryStr} />
      )}

      {/* Hero Feature: The Circular Round Table */}
      <section aria-label="The Council Chamber Round Table">
        <RoundTable
          memberStatuses={memberStatuses}
          currentSpeakerId={currentSpeaker}
          activeInteraction={activeInteraction}
          openingPositions={openings}
          crossExamRounds={rounds}
          ratificationVotes={votes}
          phase={currentPhase}
          convergenceScore={latestScore}
          isUnanimous={isUnanimous}
          status={isConcluded ? 'completed' : isRunning ? 'running' : 'idle'}
          replayStep={replayStep}
          totalReplaySteps={events.length}
          onReplayStepChange={(step) => setReplayStep(step)}
        />
      </section>

      {/* Trajectory Shift Sparklines Chart */}
      <section aria-label="How Views Shifted">
        <TrajectoryChart
          openingPositions={openings}
          crossExamRounds={rounds}
          ratificationVotes={votes}
        />
      </section>

      {/* Live Transcript Stream Feed */}
      <section aria-label="Deliberation Transcript Feed">
        <TranscriptStream
          events={transcriptEvents}
          currentSpeakerId={currentSpeaker}
        />
      </section>
    </div>
  );
}

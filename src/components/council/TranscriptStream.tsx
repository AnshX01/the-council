'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  Compass,
  Sparkles,
  Scale,
  Hammer,
  Network,
  Hourglass,
  Heart,
  Flame,
  Crown,
  Shield,
  Filter,
} from 'lucide-react';
import { PersonaProfile } from '@/types/persona';
import { ALL_PERSONAS, findPersonaById } from '@/lib/council/personas';
import { Badge } from '@/components/ui/Badge';

export interface TranscriptEvent {
  id: string;
  seq: number;
  personaId: string;
  phase: string;
  type: string;
  timestamp: string;
  summary: string;
  fullText?: string;
  confidence?: number;
  stance?: 'AGREE' | 'CHALLENGE' | 'CONCEDE' | 'NEUTRAL';
  targetPersonaId?: string;
}

export interface TranscriptStreamProps {
  events: TranscriptEvent[];
  currentSpeakerId?: string;
  onSelectPersona?: (persona: PersonaProfile) => void;
  className?: string;
}

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

export const TranscriptStream: React.FC<TranscriptStreamProps> = ({
  events = [],
  currentSpeakerId,
  onSelectPersona,
  className = '',
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [filterPersonaId, setFilterPersonaId] = useState<string>('all');
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter((ev) => {
    if (filterPersonaId === 'all') return true;
    return ev.personaId === filterPersonaId;
  });

  // Auto-scroll when new events arrive if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUp && bottomSentinelRef.current) {
      bottomSentinelRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events.length, userScrolledUp]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 60;
    setUserScrolledUp(!atBottom);
  };

  const scrollToBottom = () => {
    setUserScrolledUp(false);
    bottomSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`relative flex flex-col h-[520px] glass-panel-subtle rounded-2xl overflow-hidden ${className}`}>
      {/* Stream Header */}
      <div className="p-3.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-black/2 dark:bg-white/2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            Deliberation Log & Transcripts
          </span>
          <Badge variant="neutral" size="xs">
            {filteredEvents.length} Entries
          </Badge>
        </div>

        {/* Persona Filter Dropdown */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterPersonaId}
            onChange={(e) => setFilterPersonaId(e.target.value)}
            className="text-xs bg-transparent border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 outline-none text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Members</option>
            {ALL_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Scroll Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <Volume2 className="w-8 h-8 stroke-1 mb-2 opacity-40" />
            <p className="text-xs">Chamber convened. Waiting for opening statements...</p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const persona = findPersonaById(ev.personaId);
            const GlyphComponent = persona ? GLYPH_MAP[persona.avatarGlyph] || Shield : Shield;
            const isSpeaking = currentSpeakerId === ev.personaId;
            const isExpanded = Boolean(expandedEvents[ev.id]);
            const targetPersona = ev.targetPersonaId ? findPersonaById(ev.targetPersonaId) : null;

            return (
              <div
                key={ev.id || ev.seq}
                className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                  isSpeaking
                    ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'border-black/5 dark:border-white/5 bg-white/40 dark:bg-white/2 hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                {/* Persona Meta Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => persona && onSelectPersona?.(persona)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity font-semibold"
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${persona?.colorHex || '#6366F1'}20`,
                          color: persona?.colorHex || '#6366F1',
                        }}
                      >
                        <GlyphComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-gray-900 dark:text-gray-100">
                        {persona?.name || ev.personaId}
                      </span>
                    </button>

                    {/* Stance towards target */}
                    {ev.stance && (
                      <Badge
                        variant={
                          ev.stance === 'AGREE'
                            ? 'success'
                            : ev.stance === 'CHALLENGE'
                            ? 'danger'
                            : 'warning'
                        }
                        size="xs"
                      >
                        {ev.stance} {targetPersona ? `→ ${targetPersona.name}` : ''}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 font-mono text-[10px]">
                    {ev.confidence !== undefined && (
                      <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">
                        {ev.confidence}% Conf
                      </span>
                    )}
                    <span>#{ev.seq}</span>
                  </div>
                </div>

                {/* Statement text */}
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-sans">
                  {ev.summary}
                </p>

                {/* Collapsible Reasoning */}
                {ev.fullText && ev.fullText !== ev.summary && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(ev.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                      <span>{isExpanded ? 'Hide deep reasoning' : 'View full rationale'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-mono whitespace-pre-wrap animate-fade-in">
                        {ev.fullText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomSentinelRef} />
      </div>

      {/* Jump to Latest Floating Pill */}
      {userScrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg text-xs font-semibold flex items-center gap-1.5 transition-all animate-bounce"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Jump to Latest</span>
        </button>
      )}
    </div>
  );
};

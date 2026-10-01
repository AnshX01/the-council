'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
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
  EyeOff,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { PersonaProfile } from '@/types/persona';
import { OpeningPosition, RatificationVote } from '@/types/session';
import { Badge } from '@/components/ui/Badge';

export interface PersonaDrawerProps {
  persona: PersonaProfile | null;
  isOpen: boolean;
  onClose: () => void;
  confidence: number | null;
  openingPosition?: OpeningPosition;
  vote?: RatificationVote;
  statements?: Array<{
    phase: string;
    round?: number;
    text: string;
    stance?: string;
    confidence?: number;
  }>;
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

export const PersonaDrawer: React.FC<PersonaDrawerProps> = ({
  persona,
  isOpen,
  onClose,
  confidence,
  openingPosition,
  vote,
  statements = [],
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !persona) return null;

  const GlyphComponent = GLYPH_MAP[persona.avatarGlyph] || Shield;
  const isModerator = persona.id === 'moderator' || persona.seatNumber === 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-out Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative z-10 w-full max-w-md h-full glass-panel-elevated shadow-2xl flex flex-col overflow-hidden border-l border-white/10 dark:border-white/10 animate-slide-left"
        style={{
          borderRadius: 0,
        }}
      >
        {/* Header with Persona Accent */}
        <div
          className="p-5 border-b border-black/5 dark:border-white/10 flex items-start justify-between relative"
          style={{
            background: `linear-gradient(135deg, ${persona.colorHex}15 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-xs shrink-0"
              style={{
                backgroundColor: `${persona.colorHex}20`,
                color: persona.colorHex,
                border: `1.5px solid ${persona.colorHex}50`,
              }}
            >
              <GlyphComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="drawer-title" className="text-base font-bold text-gray-900 dark:text-gray-50">
                  {persona.name}
                </h3>
                <Badge variant="neutral" size="xs">
                  {isModerator ? 'Moderator' : `Seat ${persona.seatNumber}`}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {persona.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Status & Confidence Meter */}
          {!isModerator && (
            <div className="glass-panel-subtle p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">
                  Current Confidence
                </span>
                <div className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100">
                  {confidence !== null ? `${confidence}%` : 'N/A'}
                </div>
              </div>

              {vote && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block mb-1">
                    Ratification Vote
                  </span>
                  {vote.vote === 'SIGN_OFF' ? (
                    <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                      Signed Off
                    </Badge>
                  ) : vote.vote === 'SIGN_OFF_WITH_AMENDMENT' ? (
                    <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                      With Amendment
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm" icon={<XCircle className="w-3.5 h-3.5" />}>
                      Dissenting
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Core Lens & Reasoning Style */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>Epistemic Lens & Reasoning</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-black/2 dark:bg-white/2 p-3 rounded-lg border border-black/5 dark:border-white/5">
              {persona.reasoningStyle}
            </p>
          </div>

          {/* Blind Spots */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Known Cognitive Blind Spots</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              {persona.blindSpots}
            </p>
          </div>

          {/* Core Values */}
          {persona.coreValues && persona.coreValues.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block">
                Guiding Axioms & Values
              </span>
              <div className="flex flex-wrap gap-1.5">
                {persona.coreValues.map((val, idx) => (
                  <Badge key={idx} variant="neutral" size="xs">
                    {val}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Opening Position Snippet */}
          {openingPosition && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block">
                Opening Thesis
              </span>
              <div className="p-3 rounded-lg bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                &ldquo;{openingPosition.positionSummary}&rdquo;
              </div>
            </div>
          )}

          {/* Deliberation Contributions Log */}
          {statements.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block">
                Statements & Interventions ({statements.length})
              </span>
              <div className="space-y-2">
                {statements.map((stmt, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-black/5 dark:border-white/5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-gray-400">
                        {stmt.phase} {stmt.round ? `Round ${stmt.round}` : ''}
                      </span>
                      {stmt.stance && (
                        <Badge
                          variant={
                            stmt.stance === 'AGREE'
                              ? 'success'
                              : stmt.stance === 'CHALLENGE'
                              ? 'danger'
                              : 'warning'
                          }
                          size="xs"
                        >
                          {stmt.stance}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {stmt.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

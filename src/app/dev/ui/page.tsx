'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  History,
  Palette,
  Eye,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { RoundTable } from '@/components/council/RoundTable/RoundTable';
import { PhaseStepper } from '@/components/council/PhaseStepper';
import { ALL_PERSONAS } from '@/lib/council/personas';
import { DeliberationPhase } from '@/types/session';

export default function DesignSystemCatalogPage() {
  const [tableState, setTableState] = useState<'speaking' | 'voting' | 'unanimous' | 'deadlock' | 'offline'>('speaking');

  // Interactive mock data for RoundTable showcase
  const mockStatuses = {
    moderator: 'active' as const,
    skeptic: tableState === 'offline' ? ('unavailable' as const) : ('active' as const),
    optimist: 'active' as const,
    ethicist: 'active' as const,
    pragmatist: 'active' as const,
    systems_thinker: 'active' as const,
    historian: 'active' as const,
    humanist: 'active' as const,
    contrarian: 'active' as const,
  };

  const mockOpenings = {
    skeptic: { personaId: 'skeptic' as const, positionSummary: 'We must verify fundamental axioms empirically.', confidenceScore: 65, detailedReasoning: '', falsificationCondition: '', timestamp: '' },
    optimist: { personaId: 'optimist' as const, positionSummary: 'This unlocks unprecedented agency and growth.', confidenceScore: 88, detailedReasoning: '', falsificationCondition: '', timestamp: '' },
    ethicist: { personaId: 'ethicist' as const, positionSummary: 'Deontological boundary limits cannot be compromised.', confidenceScore: 72, detailedReasoning: '', falsificationCondition: '', timestamp: '' },
    pragmatist: { personaId: 'pragmatist' as const, positionSummary: 'Execution friction will determine actual feasibility.', confidenceScore: 80, detailedReasoning: '', falsificationCondition: '', timestamp: '' },
  };

  const mockVotes = tableState === 'voting' || tableState === 'unanimous' || tableState === 'deadlock' ? {
    skeptic: { personaId: 'skeptic' as const, cycleNumber: 1, vote: (tableState === 'deadlock' ? 'OBJECT' : 'SIGN_OFF') as any, timestamp: '' },
    optimist: { personaId: 'optimist' as const, cycleNumber: 1, vote: 'SIGN_OFF' as any, timestamp: '' },
    ethicist: { personaId: 'ethicist' as const, cycleNumber: 1, vote: (tableState === 'deadlock' ? 'SIGN_OFF_WITH_AMENDMENT' : 'SIGN_OFF') as any, timestamp: '' },
    pragmatist: { personaId: 'pragmatist' as const, cycleNumber: 1, vote: 'SIGN_OFF' as any, timestamp: '' },
  } : {};

  return (
    <div className="space-y-10 animate-fade-in max-w-5xl mx-auto py-4">
      {/* Header */}
      <div className="border-b border-black/5 dark:border-white/10 pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Palette className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-950 dark:text-gray-50">
            Atlas Design System Catalog (/dev/ui)
          </h1>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Living visual reference for Monterey glassmorphism tokens, persona palettes, interactive state variations, and the 9-seat Round Table.
        </p>
      </div>

      {/* 1. Hero Feature: Round Table Chamber States */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              The Round Table (Hero Feature)
            </h2>
            <p className="text-xs text-gray-500">
              Circular SVG seating chamber with 9 members, interaction arcs, and center VerdictSeal
            </p>
          </div>

          {/* State preset buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl glass-panel-subtle text-xs">
            {(['speaking', 'voting', 'unanimous', 'deadlock', 'offline'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTableState(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  tableState === st
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <GlassCard padded="lg" className="flex items-center justify-center !rounded-3xl">
          <RoundTable
            memberStatuses={mockStatuses}
            currentSpeakerId={tableState === 'speaking' ? 'optimist' : undefined}
            activeInteraction={
              tableState === 'speaking'
                ? { sourceId: 'optimist', targetId: 'skeptic', stance: 'CHALLENGE' }
                : null
            }
            openingPositions={mockOpenings}
            ratificationVotes={mockVotes}
            phase={tableState === 'unanimous' || tableState === 'deadlock' ? 'PHASE_5_FINAL_OUTPUT' : 'PHASE_2_CROSS_EXAM'}
            convergenceScore={tableState === 'unanimous' ? 100 : tableState === 'deadlock' ? 62 : 78}
            isUnanimous={tableState === 'unanimous'}
            status={tableState === 'unanimous' || tableState === 'deadlock' ? 'completed' : 'running'}
          />
        </GlassCard>
      </section>

      {/* 2. Phase Stepper */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Phase Stepper Component
        </h2>
        <PhaseStepper currentPhase="PHASE_2_CROSS_EXAM" />
      </section>

      {/* 3. Button Component Variants & Rage-Click Debounce */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Button System (Rage-Click Protected)
          </h2>
          <p className="text-xs text-gray-500">
            Debounced onClick handler (default 400ms) with active spring animations and accessible focus rings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md">
            Primary Action
          </Button>
          <Button variant="secondary" size="md">
            Secondary Action
          </Button>
          <Button variant="glass" size="md">
            Glass Action
          </Button>
          <Button variant="ghost" size="md">
            Ghost Action
          </Button>
          <Button variant="danger" size="md">
            Danger Action
          </Button>
          <Button variant="primary" size="md" isLoading>
            Loading State
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button variant="primary" size="xs">
            XS Button
          </Button>
          <Button variant="primary" size="sm">
            SM Button
          </Button>
          <Button variant="primary" size="md">
            MD Button
          </Button>
          <Button variant="primary" size="lg">
            LG Button
          </Button>
        </div>
      </section>

      {/* 4. Badges & Persona Accents */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Badge System & Persona Palette
          </h2>
          <p className="text-xs text-gray-500">
            Sole saturated accents across monochrome neutral chamber
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="accent" size="sm">Accent</Badge>
          <Badge variant="success" size="sm">Signed Off</Badge>
          <Badge variant="warning" size="sm">Amendment</Badge>
          <Badge variant="danger" size="sm">Dissent</Badge>
          <Badge variant="neutral" size="sm">Neutral</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {ALL_PERSONAS.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-xl border border-black/5 dark:border-white/5 glass-panel-subtle flex items-center gap-2.5 text-xs"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: p.colorHex }}
              />
              <div className="min-w-0">
                <span className="font-semibold block truncate text-gray-900 dark:text-gray-100">
                  {p.name}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {p.colorHex}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Origin: AnshX01/Atlas (frontend/src/app/dev/ui)
 * The Council - Living Design System Catalog (/dev/ui)
 * Flat, borderless, monochrome, Inter-spaced component showcase.
 * Displays all Atlas primitives, persona color swatches, and interactive Round Table states.
 */

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Palette,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Compass,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, SearchInput } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { Tabs } from "@/components/ui/Tabs";
import { Surface } from "@/components/ui/Surface";
import { RoundTable } from "@/components/council/RoundTable/RoundTable";
import { PhaseStepper } from "@/components/council/PhaseStepper";
import { ALL_PERSONAS } from "@/lib/council/personas";

export default function DesignSystemCatalogPage() {
  const [tableState, setTableState] = useState<"speaking" | "voting" | "unanimous" | "deadlock" | "offline">("speaking");
  const [toggleVal, setToggleVal] = useState(true);
  const [sliderVal, setSliderVal] = useState(65);
  const [activeTab, setActiveTab] = useState("preview");

  const mockStatuses = {
    moderator: "active" as const,
    skeptic: tableState === "offline" ? ("unavailable" as const) : ("active" as const),
    optimist: "active" as const,
    ethicist: "active" as const,
    pragmatist: "active" as const,
    systems_thinker: "active" as const,
    historian: "active" as const,
    humanist: "active" as const,
    contrarian: "active" as const,
  };

  const mockOpenings = {
    skeptic: { personaId: "skeptic" as const, positionSummary: "We must verify fundamental axioms empirically.", confidenceScore: 65, detailedReasoning: "", falsificationCondition: "", timestamp: "" },
    optimist: { personaId: "optimist" as const, positionSummary: "This unlocks unprecedented agency and growth.", confidenceScore: 88, detailedReasoning: "", falsificationCondition: "", timestamp: "" },
    ethicist: { personaId: "ethicist" as const, positionSummary: "Deontological boundary limits cannot be compromised.", confidenceScore: 72, detailedReasoning: "", falsificationCondition: "", timestamp: "" },
    pragmatist: { personaId: "pragmatist" as const, positionSummary: "Execution friction will determine actual feasibility.", confidenceScore: 80, detailedReasoning: "", falsificationCondition: "", timestamp: "" },
  };

  const mockVotes = tableState === "voting" || tableState === "unanimous" || tableState === "deadlock" ? {
    skeptic: { personaId: "skeptic" as const, cycleNumber: 1, vote: (tableState === "deadlock" ? "OBJECT" : "SIGN_OFF") as any, timestamp: "" },
    optimist: { personaId: "optimist" as const, cycleNumber: 1, vote: "SIGN_OFF" as any, timestamp: "" },
    ethicist: { personaId: "ethicist" as const, cycleNumber: 1, vote: (tableState === "deadlock" ? "SIGN_OFF_WITH_AMENDMENT" : "SIGN_OFF") as any, timestamp: "" },
    pragmatist: { personaId: "pragmatist" as const, cycleNumber: 1, vote: "SIGN_OFF" as any, timestamp: "" },
    systems_thinker: { personaId: "systems_thinker" as const, cycleNumber: 1, vote: "SIGN_OFF" as any, timestamp: "" },
    historian: { personaId: "historian" as const, cycleNumber: 1, vote: "SIGN_OFF" as any, timestamp: "" },
    humanist: { personaId: "humanist" as const, cycleNumber: 1, vote: "SIGN_OFF" as any, timestamp: "" },
    contrarian: { personaId: "contrarian" as const, cycleNumber: 1, vote: "SIGN_OFF" as any, timestamp: "" },
  } : {};

  return (
    <div className="space-y-12 max-w-5xl mx-auto py-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
            Component Library & Archetypes
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Atlas Design Catalog
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Living visual reference for flat, borderless, monochrome primitives and the centerpiece Round Table v3.
        </p>
      </div>

      {/* 1. Hero Feature: The Round Table Chamber */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              The Round Table (Hero Feature)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              9-seat circular amphitheater with dynamic interaction arcs, spotlight, and central VerdictSeal.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)]">
            {(["speaking", "voting", "unanimous", "deadlock", "offline"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTableState(st)}
                className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors ${
                  tableState === st
                    ? "bg-[var(--accent)] text-[var(--bg-primary)] font-medium"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <Surface className="p-6 flex items-center justify-center">
          <RoundTable
            memberStatuses={mockStatuses}
            currentSpeakerId={tableState === "speaking" ? "optimist" : undefined}
            activeInteraction={
              tableState === "speaking"
                ? { sourceId: "optimist", targetId: "skeptic", stance: "CHALLENGE" }
                : null
            }
            openingPositions={mockOpenings}
            ratificationVotes={mockVotes}
            phase={tableState === "unanimous" || tableState === "deadlock" ? "PHASE_5_FINAL_OUTPUT" : "PHASE_2_CROSS_EXAM"}
            convergenceScore={tableState === "unanimous" ? 100 : tableState === "deadlock" ? 62 : 82}
            isUnanimous={tableState === "unanimous"}
            status={tableState === "unanimous" || tableState === "deadlock" ? "completed" : "running"}
          />
        </Surface>
      </section>

      {/* 2. Phase Stepper */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Phase Stepper Component
        </h2>
        <Surface className="p-5">
          <PhaseStepper currentPhase="PHASE_2_CROSS_EXAM" />
        </Surface>
      </section>

      {/* 3. Button Primitives */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Buttons (Tonal & Spring-Eased)
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            whileTap scale 0.97, borderless tonal fills, rounded-xl.
          </p>
        </div>

        <Surface className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md">
              Primary Action
            </Button>
            <Button variant="secondary" size="md">
              Secondary Action
            </Button>
            <Button variant="ghost" size="md">
              Ghost Action
            </Button>
            <Button variant="danger" size="md">
              Destructive Action
            </Button>
            <Button variant="primary" size="md" isLoading>
              Loading State
            </Button>
            <Button variant="secondary" size="md" disabled>
              Disabled Action
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" size="sm">
              Small (sm)
            </Button>
            <Button variant="secondary" size="md">
              Medium (md)
            </Button>
            <Button variant="secondary" size="lg">
              Large (lg)
            </Button>
          </div>
        </Surface>
      </section>

      {/* 4. Inputs & Controls */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Inputs, Toggles & Sliders
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Atlas design primitives with uppercase micro-labels and spring switches.
          </p>
        </div>

        <Surface className="p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Standard Text Field"
              placeholder="Enter deliberation topic..."
            />
            <SearchInput
              label="Search Input"
              placeholder="Search across sessions and transcripts..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-[var(--border-subtle)]">
            <Toggle
              label="Interactive Spring Switch"
              description="Seamless physics-based motion with accessible switch role."
              checked={toggleVal}
              onChange={setToggleVal}
            />
            <Slider
              label="Labelled Numeric Slider"
              unit="%"
              min={0}
              max={100}
              value={sliderVal}
              onChange={setSliderVal}
              description="Displays real-time numeric readout beside the header."
            />
          </div>
        </Surface>
      </section>

      {/* 5. Badges & Persona Color Accents */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Status Badges & Persona Chroma
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Persona colors serve as the ONLY chroma in the application; all other elements remain strictly monochrome.
          </p>
        </div>

        <Surface className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="low" size="sm">Low / Agreed</Badge>
            <Badge variant="medium" size="sm">Medium / Amendment</Badge>
            <Badge variant="high" size="sm">High / Warning</Badge>
            <Badge variant="urgent" size="sm">Urgent / Dissent</Badge>
            <Badge variant="neutral" size="sm">Neutral Pill</Badge>
            <Badge variant="accent" size="sm">Accent Pill</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-subtle)]">
            {ALL_PERSONAS.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex items-center gap-2.5 text-xs"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.colorHex }}
                />
                <div className="min-w-0">
                  <span className="font-semibold block truncate text-[var(--text-primary)]">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {p.colorHex}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </div>
  );
}

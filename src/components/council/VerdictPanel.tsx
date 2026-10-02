/**
 * Origin: The Council — Verdict Panel (Section 5.3)
 * Neutral Atlas-grade verdict hero:
 * - Tonal badge (Unanimous / Consensus Not Fully Reached)
 * - 26px verdict headline in text-primary (no yellow/gold text, no colored frame glow)
 * - Actionable guidance
 * - Pillars (mono numbers) & Caveats (dash bullets)
 * - Honesty Rule recorded dissent and reservations disclosure
 * - Summary counts line and action buttons
 */

"use client";

import React, { useState } from "react";
import { Check, Scale, Copy, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { FinalVerdict, DeliberationSession, SurvivingObjection } from "@/types/session";
import { PersonaId } from "@/types/persona";
import { findPersonaById } from "@/lib/council/personas";
import { PersonaGlyph } from "@/components/council/PersonaGlyph";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export interface VerdictPanelProps {
  session: DeliberationSession;
  className?: string;
}

export const VerdictPanel: React.FC<VerdictPanelProps> = ({ session, className = "" }) => {
  const verdict = session.finalVerdict;
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  if (!verdict) {
    return (
      <div className="py-20 text-center text-xs text-[var(--text-muted)]">
        Deliberation in progress. Final resolution will be published upon ratification.
      </div>
    );
  }

  const vAny = verdict as any;
  const dissenters: SurvivingObjection[] =
    verdict.survivingObjections || vAny.dissenters || [];

  const headline: string =
    verdict.verdictOneLiner || vAny.conclusion || "Deliberation Concluded";

  const actionableGuidance: string =
    verdict.actionableConclusion || vAny.actionableGuidance || vAny.recommendation || "";

  const pillars: string[] =
    verdict.keySupportingReasons || vAny.pillars || [];

  const caveats: string[] =
    verdict.criticalCaveatsAndRisks || vAny.caveats || [];

  const rounds = session.crossExamRounds?.length || 3;
  const ratifiedCount = verdict.ratifiedBy ? verdict.ratifiedBy.length : (8 - dissenters.length);
  const dissentCount = dissenters.length;

  const isUnanimous: boolean = Boolean(
    verdict.isUnanimous ||
    vAny.verdictType === "UNANIMOUS" ||
    verdict.status === "UNANIMOUS_CONSENSUS" ||
    (ratifiedCount === 8 && dissentCount === 0)
  );

  const isSplitDecision = !isUnanimous && ratifiedCount === 4 && dissentCount === 4;
  const isMajority = !isUnanimous && !isSplitDecision && ratifiedCount >= 5;
  const isRejected = !isUnanimous && ratifiedCount < 4;

  const badgeLabel = isUnanimous
    ? "Unanimous Consensus Reached"
    : isSplitDecision
    ? "Divided Council (50-50 Split)"
    : isMajority
    ? "Majority Verdict Reached"
    : "Consensus Failed (Majority Dissent)";

  const badgeColorClasses = isUnanimous
    ? "bg-[var(--status-low)]/10 text-[var(--status-low)]"
    : isSplitDecision
    ? "bg-[var(--status-medium)]/10 text-[var(--status-medium)] border border-[var(--status-medium)]/20"
    : isMajority
    ? "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
    : "bg-[var(--status-urgent)]/10 text-[var(--status-urgent)] border border-[var(--status-urgent)]/20";

  const sessionId = (session as any).id || session.sessionId;

  const toggleReason = (pid: string) => {
    setExpandedReasons((prev) => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleCopySummary = () => {
    const summary = `THE COUNCIL RESOLUTION
Status: ${badgeLabel}
Conclusion: ${headline}

Actionable Guidance:
${actionableGuidance}

Justification Pillars:
${pillars.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Critical Caveats:
${caveats.map((c) => `- ${c}`).join("\n")}
`;
    navigator.clipboard.writeText(summary);
    toast.success("Copied to Clipboard");
  };

  const handleExportMarkdown = () => {
    window.open(`/api/v1/sessions/${sessionId}/export?format=md`, "_blank");
  };

  return (
    <div className={cn("flex flex-col gap-6 select-text", className)}>
      {/* Neutral Hero Card */}
      <div className="p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-4">
        {/* Status Badge & Counts Line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium",
                badgeColorClasses
              )}
            >
              {isUnanimous ? (
                <Check size={12} strokeWidth={2.5} />
              ) : (
                <Scale size={12} strokeWidth={2} />
              )}
              <span>{badgeLabel}</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {ratifiedCount} of 8 ratified · {dissenters.length} reservations · {rounds} rounds
          </span>
        </div>

        {/* 26px Verdict Headline in text-primary */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Deliberation Concluded &bull; {isUnanimous ? "Unanimous Synthesis" : "Dialectic Synthesis"}
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-snug">
            {headline}
          </h2>
        </div>

        {/* Actionable Guidance Paragraph */}
        {actionableGuidance && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Actionable Guidance
            </span>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {actionableGuidance}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopySummary}
          >
            <Copy size={13} className="mr-1.5" />
            Copy Deliberation Summary
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportMarkdown}
          >
            <FileText size={13} className="mr-1.5" />
            Export Markdown
          </Button>
        </div>
      </div>

      {/* Two Columns: Pillars & Caveats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pillars Column */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Key Pillars of Agreement
          </span>
          <div className="flex flex-col gap-2.5">
            {pillars.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No distinct pillars recorded.</p>
            ) : (
              pillars.map((pillar, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                  <span className="font-mono text-[11px] font-bold text-[var(--text-muted)] flex-shrink-0 pt-0.5">
                    0{idx + 1}
                  </span>
                  <p className="text-[var(--text-secondary)]">{pillar}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Caveats Column */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Crucial Caveats & Boundary Conditions
          </span>
          <div className="flex flex-col gap-2.5">
            {caveats.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No boundary caveats recorded.</p>
            ) : (
              caveats.map((caveat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed">
                  <span className="text-[var(--text-muted)] font-mono flex-shrink-0">—</span>
                  <p className="text-[var(--text-secondary)]">{caveat}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Honesty Rule: Recorded Dissent and Reservations */}
      {dissenters.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Strict Honesty Rule: Recorded Dissent & Reservations
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {dissenters.length} Persona{dissenters.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {dissenters.map((d: any) => {
              const pid = (d.personaId || "") as PersonaId;
              const persona = findPersonaById(pid);
              const color = persona?.colorHex || "#EF4444";
              const isExpanded = !!expandedReasons[pid];
              const principle = d.irreconcilablePrinciple || d.uncompromisingPrinciple || "Core boundary reservation";
              const objection = d.objectionText || d.coreObjection;

              return (
                <div
                  key={pid}
                  className="p-3 rounded-xl bg-[var(--bg-tertiary)] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${color}20`,
                          color,
                        }}
                      >
                        <PersonaGlyph persona={persona} personaId={pid} size={14} />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {persona?.name || pid}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-secondary)] text-[var(--status-urgent)]">
                        Dissent
                      </span>
                    </div>

                    <button
                      onClick={() => toggleReason(pid)}
                      className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                    >
                      <span>{isExpanded ? "Hide" : "Show reason"}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-medium text-[var(--text-primary)]">Principle: </span>
                    {principle}
                  </p>

                  {isExpanded && objection && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] leading-relaxed">
                      <span className="font-semibold text-[var(--text-secondary)]">Objection Detail: </span>
                      {objection}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shifts Summary Card */}
      <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          How Personas&apos; Views Shifted
        </span>
        <span className="text-xs text-[var(--text-muted)] font-mono">
          8 of 8 personas analyzed across {rounds} rounds
        </span>
      </div>
    </div>
  );
};

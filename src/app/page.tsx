/**
 * Origin: The Council — Home / Question Composer (Section 5.2)
 * Atlas-grade centered composer (ChatInput style), template selectors,
 * suggested dilemma rows, and compact council persona strip.
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Sliders,
  ChevronDown,
  Sparkles,
  Compass,
  Check,
  Info,
} from "lucide-react";
import { COUNCIL_MEMBERS, PersonaProfile } from "@/lib/council/personas";
import { PersonaDrawer } from "@/components/council/RoundTable/PersonaDrawer";
import { PersonaGlyph } from "@/components/council/PersonaGlyph";
import { useEngineStatus, useSettings } from "@/lib/ui/hooks";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    label: "Decision",
    prefix: "I must decide between: [Option A] and [Option B]. The core tradeoff is:",
  },
  {
    label: "Ethical Dilemma",
    prefix: "Evaluate the moral and systemic implications of:",
  },
  {
    label: "Plan Review",
    prefix: "Stress-test the following strategic plan against blind spots and failure modes:",
  },
  {
    label: "Pros & Cons",
    prefix: "Provide a multi-perspective stress test of the arguments for and against:",
  },
];

const SUGGESTED_DILEMMAS = [
  {
    category: "Career vs. Family",
    text: "Should a career professional in their 40s pivot entirely from stable corporate management to a high-paying executive job that requires relocation and 80-hour weeks away from young family?",
  },
  {
    category: "Ship of Theseus",
    text: "Over many years, every wooden plank of a ship is gradually replaced until no original part remains. If the discarded planks are reassembled into a second vessel, which is the real Ship of Theseus: physical material or continuous form?",
  },
  {
    category: "AI Regulation",
    text: "How should an autonomous frontier research lab balance intellectual openness and scientific transparency with withholding potentially dangerous dual-use biosecurity AI models?",
  },
  {
    category: "Startup Dilemma",
    text: "Should a bootstrapped founder accept a $50M corporate acquisition offer or decline to pursue an independent, high-risk autonomous mission with potential societal transformation?",
  },
  {
    category: "Medical Ethics",
    text: "Should an autonomous hospital emergency triage system prioritize expected quality-adjusted life years (QALYs) or strictly adhere to first-come-first-served emergency access?",
  },
  {
    category: "Climate Policy",
    text: "Is it ethical for a low-lying island nation facing imminent submersion to unilaterally deploy solar radiation geoengineering without global consensus?",
  },
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);

  // Composer options
  const [rounds, setRounds] = useState(3);
  const [showRoundsMenu, setShowRoundsMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const engineStatus = useEngineStatus();
  const { settings } = useSettings();

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [query]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          query: trimmed,
          options: {
            maxCrossExamRounds: rounds,
            maxRatificationCycles: settings.maxRatificationCycles || 2,
            mockMode: engineStatus.mode === "simulation",
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      const sessionId = json.data?.session?.id || json.session?.id || json.id;

      if (!sessionId) {
        throw new Error("Server did not return a valid session ID");
      }

      toast.success("Council convened. Entering deliberation chamber...");
      router.push(`/c/${sessionId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create deliberation");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center pt-8 sm:pt-14 pb-16">
      {/* Simulation / Notice Banner */}
      {!engineStatus.keyConfigured && (
        <div className="w-full mb-6 px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[var(--text-muted)] flex-shrink-0" />
            <span>Running in Demo Simulation Mode. Set Gemini key in Settings for live LLMs.</span>
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="text-[11px] font-medium text-[var(--accent)] hover:underline whitespace-nowrap ml-2"
          >
            Settings →
          </button>
        </div>
      )}

      {/* Main Title (Atlas H1 scale) */}
      <div className="flex flex-col items-center text-center mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
          Eight Autonomous AI Personas &bull; Adversarial Dialectics
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
          The Council
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1.5">
          What should the council consider?
        </p>
      </div>

      {/* Atlas ChatInput Composer Container */}
      <div className="w-full rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3 focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Frame a dilemma, hard decision, or ethical conflict..."
          rows={3}
          maxLength={2000}
          className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none leading-relaxed"
          aria-label="Deliberation question input"
        />

        {/* Composer Bottom Row: Options Chips & Send Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-2">
          {/* Option Chips */}
          <div className="flex items-center gap-1.5 relative">
            {/* Rounds Selector Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoundsMenu(!showRoundsMenu)}
                className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1 transition-colors"
                aria-label="Select cross-examination rounds"
              >
                <span>{rounds} Rounds</span>
                <ChevronDown size={12} />
              </button>
              {showRoundsMenu && (
                <div className="absolute left-0 bottom-full mb-1 z-30 w-32 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-none flex flex-col gap-0.5 animate-spring-scale">
                  {[2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRounds(r);
                        setShowRoundsMenu(false);
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-left",
                        r === rounds
                          ? "bg-[var(--accent)]/10 text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                      )}
                    >
                      <span>{r} Rounds</span>
                      {r === rounds && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template Selector Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-1 transition-colors"
                aria-label="Select dilemma template"
              >
                <span>Template</span>
                <ChevronDown size={12} />
              </button>
              {showTemplateMenu && (
                <div className="absolute left-0 bottom-full mb-1 z-30 w-48 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-none flex flex-col gap-0.5 animate-spring-scale">
                  {TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      onClick={() => {
                        setQuery(tmpl.prefix + " ");
                        setShowTemplateMenu(false);
                        textareaRef.current?.focus();
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-left text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model Badge */}
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="px-2 py-1 rounded-lg text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Change model in Settings"
            >
              {engineStatus.model}
            </button>
          </div>

          {/* Right: Character Count & Round Send Button */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {query.length} / 2000
            </span>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isLoading}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                query.trim()
                  ? "bg-[var(--accent)] text-[var(--bg-primary)] active:scale-95"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed opacity-50"
              )}
              aria-label="Convene The Council"
              title="Convene The Council"
            >
              <span className="sr-only">Convene The Council</span>
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-[var(--bg-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp size={16} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Dilemmas (Six Quiet Rows) */}
      <div className="w-full mt-10">
        <div className="px-1 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Suggested Inquiries
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {SUGGESTED_DILEMMAS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(item.text);
                textareaRef.current?.focus();
              }}
              className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-left transition-colors flex items-baseline justify-between gap-3 group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono font-medium text-[var(--text-muted)]">
                  {item.category}
                </span>
                <p className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors leading-relaxed">
                  {item.text}
                </p>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0">
                Use →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* The Council (Compact Strip of 8 Personas) */}
      <div className="w-full mt-10">
        <div className="px-1 mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            The Council Members
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">8 Voting + Moderator</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COUNCIL_MEMBERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPersona(p)}
              className="p-2.5 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center gap-2.5 transition-colors text-left"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${p.colorHex}20`,
                  color: p.colorHex,
                }}
              >
                <PersonaGlyph persona={p} personaId={p.id} size={15} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {p.name}
                </h4>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{p.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Persona Drawer on Click */}
      <PersonaDrawer
        persona={selectedPersona}
        isOpen={!!selectedPersona}
        onClose={() => setSelectedPersona(null)}
        confidence={null}
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Shield, Scale, Lightbulb, Users, Compass, ExternalLink } from 'lucide-react';
import { COUNCIL_MEMBERS, PersonaProfile } from '@/lib/council/personas';
import { PersonaDetailModal } from '@/components/PersonaDetailModal';

const EXAMPLE_PROMPTS = [
  {
    label: 'Career vs. Family',
    text: 'Should a career professional in their 40s pivot entirely from stable corporate management to a high-paying executive job that requires relocate and 80h weeks away from young family?',
  },
  {
    label: 'AI Regulation',
    text: 'How should a research lab balance intellectual transparency with withholding potentially dangerous dual-use biosecurity AI models?',
  },
  {
    label: 'Startup Dilemma',
    text: 'Should a founder turn down a $50M acquisition offer to pursue a high-risk autonomous mission with potential societal transformation?',
  },
  {
    label: 'Medical Ethics',
    text: 'Should an autonomous hospital triage system prioritize expected quality-adjusted life years (QALYs) or strictly first-come-first-served emergency access?',
  },
  {
    label: 'Climate Policy',
    text: 'Is it ethical for a coastal nation facing imminent submersion to unilaterally deploy solar radiation geoengineering without unanimous global consensus?',
  },
];

export default function LandingPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 10) {
      setError('Please formulate a question of at least 10 characters for the council to deliberate.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to convene the council');
      }

      const { sessionId } = await res.json();
      router.push(`/session/${sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check connection and try again.');
      setIsLoading(false);
    }
  };

  const handlePromptClick = (text: string) => {
    setQuery(text);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Eight Autonomous AI Personas &bull; Adversarial Deliberation &bull; Unanimous Ratification</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-gray-950 dark:text-gray-50 mb-3 leading-tight">
          The Council
        </h1>

        <p className="font-serif text-lg sm:text-2xl font-medium text-indigo-600 dark:text-indigo-400 mb-4">
          Where Hard Dilemmas Meet Disciplined Consensus
        </p>

        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-sans leading-relaxed max-w-2xl mx-auto">
          Submit any high-stakes question of ethics, policy, business, philosophy, or personal strategy.
          An autonomous council of 8 distinct philosophical archetypes debates, stress-tests, and forges authentic consensus.
        </p>
      </div>

      {/* Query Formulation Input Box */}
      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/70 p-2 sm:p-2.5 backdrop-blur-md shadow-lg transition-smooth focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20">
            <textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              placeholder="What should the council consider? (e.g. ethical dilemmas, policy trade-offs, high-stakes decisions...)"
              className="w-full resize-none bg-transparent p-3 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none leading-relaxed"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between pt-2 px-2 border-t border-gray-100 dark:border-gray-800/60">
              <span className="text-[11px] text-gray-400 font-mono">
                {query.length} / 2000 chars
              </span>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium text-xs sm:text-sm shadow-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Convening Chamber...</span>
                  </>
                ) : (
                  <>
                    <span>Convene The Council</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <p className="mt-2.5 text-xs text-red-600 dark:text-red-400 text-center font-medium">
            {error}
          </p>
        )}

        {/* Quiet Suggestion Chips */}
        <div className="mt-8">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 text-center mb-3">
            Pivotal Dilemmas for Consideration
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXAMPLE_PROMPTS.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePromptClick(item.text)}
                className="text-left text-xs px-3 py-1.5 rounded-full border border-gray-200/70 dark:border-gray-800 bg-white/50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-smooth"
              >
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1.5">{item.label}:</span>
                <span>{item.text.length > 55 ? `${item.text.slice(0, 55)}...` : item.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Council Members Preview Grid */}
      <div className="w-full max-w-5xl mx-auto mt-16 pt-8 border-t border-gray-200/60 dark:border-gray-800/60">
        <div className="text-center mb-6">
          <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-gray-100">
            Meet the Council Members
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Click any member to inspect their core values, reasoning style, and intellectual blind spots
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COUNCIL_MEMBERS.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedPersona(member)}
              className="group text-left p-3.5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-850 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-md transition-smooth"
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
                  style={{ backgroundColor: `${member.colorHex}20`, color: member.colorHex }}
                >
                  {member.seatNumber}
                </div>
                <span
                  className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${member.colorHex}10`,
                    borderColor: `${member.colorHex}30`,
                    color: member.colorHex,
                  }}
                >
                  {member.archetype}
                </span>
              </div>
              <h4 className="font-serif font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {member.name}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                {member.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Footnotes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200/50 dark:border-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">8 Genuinely Diverse Archetypes</h4>
            <p className="leading-relaxed">Skeptic, Optimist, Ethicist, Pragmatist, Systems Thinker, Historian, Humanist, and Contrarian.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Strict Honesty Rule</h4>
            <p className="leading-relaxed">Unanimity is never faked. If members cannot agree after debate cycles, formal dissent is registered.</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Compass className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">Dynamic Shift Tracking</h4>
            <p className="leading-relaxed">Watch confidence scores move round-over-round as members are challenged and persuaded by peers.</p>
          </div>
        </div>
      </div>

      {/* Persona Detail Modal */}
      {selectedPersona && (
        <PersonaDetailModal
          persona={selectedPersona}
          onClose={() => setSelectedPersona(null)}
        />
      )}
    </div>
  );
}

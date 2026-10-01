'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Scale,
  Compass,
  Key,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  CornerDownLeft,
} from 'lucide-react';
import { COUNCIL_MEMBERS, PersonaProfile } from '@/lib/council/personas';
import { PersonaDetailModal } from '@/components/PersonaDetailModal';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

const EXAMPLE_PROMPTS = [
  {
    label: 'Career vs. Family',
    text: 'Should a career professional in their 40s pivot entirely from stable corporate management to a high-paying executive job that requires relocate and 80h weeks away from young family?',
  },
  {
    label: 'Ship of Theseus',
    text: 'Over many years, every wooden plank of a ship is gradually replaced until no original part remains. If the discarded planks are reassembled into a second vessel, which ship is the real Ship of Theseus: physical material or continuous form?',
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
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [engineModel, setEngineModel] = useState('gemini-2.5-flash');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('the_council_gemini_api_key') : null;
    const storedModel = typeof window !== 'undefined' ? localStorage.getItem('the_council_gemini_model') : null;
    if (storedModel) setEngineModel(storedModel);

    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasServerApiKey || (storedKey && storedKey.length > 5)) {
          setHasKey(true);
          if (data.serverModel && !storedModel) setEngineModel(data.serverModel);
        } else {
          setHasKey(false);
        }
      })
      .catch(() => {
        if (storedKey && storedKey.length > 5) setHasKey(true);
      });
  }, [isKeyModalOpen]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || query.trim().length < 10) {
      setError('Please formulate a question of at least 10 characters for the council to deliberate.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let apiKey: string | undefined;
      let modelId: string | undefined;
      let maxCrossExamRounds: number | undefined;

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('the_council_gemini_api_key');
        if (stored && stored.trim().length > 5) {
          apiKey = stored.trim();
        }
        const m = localStorage.getItem('the_council_gemini_model');
        if (m) modelId = m;
        const r = localStorage.getItem('the_council_max_rounds');
        if (r) {
          const parsedRounds = parseInt(r, 10);
          if (!isNaN(parsedRounds)) maxCrossExamRounds = Math.min(8, Math.max(1, parsedRounds));
        }
      }

      let res = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          options: {
            apiKey,
            modelId,
            maxCrossExamRounds,
          },
        }),
      });

      if (!res.ok) {
        res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            options: {
              apiKey,
              modelId,
              maxCrossExamRounds,
            },
          }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to convene the council');
      }

      const resData = await res.json();
      const sessionId = resData.data?.sessionId || resData.data?.session?.id || resData.sessionId;
      toast({
        type: 'info',
        title: 'Chamber Convened',
        description: 'Seating the personas and initiating neutral framing...',
      });
      router.push(`/session/${sessionId}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please check connection and try again.');
      setIsLoading(false);
      toast({
        type: 'error',
        title: 'Convening Failed',
        description: err.message || 'Unable to start deliberation session.',
      });
    }
  };

  const handlePromptClick = (text: string) => {
    setQuery(text);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] py-6 sm:py-10 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <Badge variant="accent" size="sm" dot icon={<Sparkles className="w-3.5 h-3.5" />}>
            <span>Eight Autonomous AI Personas &bull; Adversarial Deliberation &bull; Unanimous Ratification</span>
          </Badge>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-gray-950 dark:text-gray-50 mb-3 leading-tight">
          The Council
        </h1>

        <p className="font-serif text-lg sm:text-2xl font-medium text-indigo-600 dark:text-indigo-400 mb-3.5 tracking-tight">
          Where Hard Dilemmas Meet Disciplined Consensus
        </p>

        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-sans leading-relaxed max-w-2xl mx-auto">
          Submit any high-stakes question of ethics, policy, business, philosophy, or personal strategy.
          An autonomous council of 8 distinct philosophical archetypes debates, stress-tests, and forges authentic consensus.
        </p>
      </div>

      {/* Query Formulation Input Box */}
      <div className="w-full max-w-2xl mx-auto space-y-3">
        <form onSubmit={handleSubmit} className="relative group">
          <GlassCard
            padded="none"
            className="p-2 sm:p-2.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500/70 dark:focus-within:border-indigo-400"
          >
            <textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              placeholder="What should the council consider? (e.g. ethical dilemmas, policy trade-offs, high-stakes decisions...)"
              className="w-full resize-none bg-transparent p-3 sm:p-3.5 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none leading-relaxed"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between pt-2 px-2.5 border-t border-gray-100 dark:border-white/10">
              <span className="text-[11px] text-gray-400 font-mono">
                {query.length} / 2000 chars
              </span>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                loadingText="Convening Chamber..."
                disabled={isLoading || !query.trim()}
                onClick={(e) => handleSubmit(e)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="shadow-md shadow-indigo-600/20"
              >
                Convene The Council
              </Button>
            </div>
          </GlassCard>
        </form>

        {/* Engine Status Banner */}
        <GlassCard
          padded="sm"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs !rounded-[14px]"
        >
          <div className="flex items-center gap-2">
            {hasKey ? (
              <Badge variant="success" size="sm" dot icon={<CheckCircle className="w-3.5 h-3.5" />}>
                <span>Live Gemini Engine ({engineModel})</span>
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                <span>Simulation Mode (Gemini key not set)</span>
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(true)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{hasKey ? 'Engine Settings' : 'Enter Gemini API Key'}</span>
          </button>
        </GlassCard>

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400 text-center font-medium bg-red-500/10 p-2.5 rounded-[10px] border border-red-500/25">
            {error}
          </p>
        )}

        {/* Quiet Suggestion Chips */}
        <div className="pt-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 text-center mb-3">
            Pivotal Dilemmas for Consideration
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXAMPLE_PROMPTS.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handlePromptClick(item.text)}
                className="text-left text-xs px-3 py-1.5 rounded-full border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.05] backdrop-blur-md text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white hover:border-indigo-400/60 dark:hover:border-indigo-500/60 hover:bg-white/90 dark:hover:bg-white/[0.1] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-xs"
              >
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-1.5">{item.label}:</span>
                <span>{item.text.length > 55 ? `${item.text.slice(0, 55)}...` : item.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Council Members Preview Grid */}
      <div className="w-full max-w-5xl mx-auto mt-14 pt-8 border-t border-gray-200/60 dark:border-white/10">
        <div className="text-center mb-6">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-gray-950 dark:text-gray-50 tracking-tight">
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
              className="group text-left p-3.5 rounded-[16px] border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] hover:bg-white/90 dark:hover:bg-white/[0.1] hover:border-indigo-400/50 dark:hover:border-indigo-500/50 backdrop-blur-md shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold font-mono border"
                  style={{
                    backgroundColor: `${member.colorHex}18`,
                    color: member.colorHex,
                    borderColor: `${member.colorHex}40`,
                  }}
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
              <h4 className="font-serif font-bold text-xs sm:text-sm text-gray-950 dark:text-gray-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {member.name}
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                {member.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Footnotes in Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200/60 dark:border-white/10 text-xs">
        <GlassCard padded="sm" className="flex items-start gap-3 !rounded-[14px]">
          <div className="w-8 h-8 rounded-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">8 Genuinely Diverse Archetypes</h4>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Skeptic, Optimist, Ethicist, Pragmatist, Systems Thinker, Historian, Humanist, and Contrarian.
            </p>
          </div>
        </GlassCard>

        <GlassCard padded="sm" className="flex items-start gap-3 !rounded-[14px]">
          <div className="w-8 h-8 rounded-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Strict Honesty Rule</h4>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Unanimity is never faked. If members cannot agree after debate cycles, formal dissent is registered.
            </p>
          </div>
        </GlassCard>

        <GlassCard padded="sm" className="flex items-start gap-3 !rounded-[14px]">
          <div className="w-8 h-8 rounded-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Dynamic Shift Tracking</h4>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Watch confidence scores move round-over-round as members are challenged and persuaded by peers.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Persona Detail Modal */}
      {selectedPersona && (
        <PersonaDetailModal
          persona={selectedPersona}
          onClose={() => setSelectedPersona(null)}
        />
      )}

      {/* Gemini Engine Settings Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onSave={() => setIsKeyModalOpen(false)}
      />
    </div>
  );
}

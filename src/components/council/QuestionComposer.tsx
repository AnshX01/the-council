'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Shield,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { checkSensitiveTopic } from '@/lib/council/sensitiveTopics';

export interface QuestionComposerProps {
  onSubmit: (data: {
    query: string;
    options?: {
      mockMode?: boolean;
      maxCrossExamRounds?: number;
      concurrencyLimit?: number;
    };
  }) => void;
  isLoading?: boolean;
  className?: string;
}

const TEMPLATE_PROMPTS = [
  'Should an autonomous vehicle prioritize passenger survival or minimizing total casualties?',
  'Monolith vs Microservices for a core banking ledger at 50,000 TPS: which architecture is defensible?',
  'Is human cognitive enhancement via invasive neural interfaces a moral imperative or existential risk?',
  'Should frontier AI models be open-weighted or strictly gated under national security licenses?',
];

export const QuestionComposer: React.FC<QuestionComposerProps> = ({
  onSubmit,
  isLoading = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mockMode, setMockMode] = useState(false);
  const [maxRounds, setMaxRounds] = useState(3);
  const [concurrency, setConcurrency] = useState(4);

  const sensitiveCheck = query.length > 5 ? checkSensitiveTopic(query) : null;
  const isSubmitDisabled = !query.trim() || query.trim().length < 8 || isLoading;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitDisabled) return;

    onSubmit({
      query: query.trim(),
      options: {
        mockMode,
        maxCrossExamRounds: maxRounds,
        concurrencyLimit: concurrency,
      },
    });
  };

  return (
    <div className={`w-full max-w-2xl mx-auto space-y-4 ${className}`}>
      <GlassCard padded="md" className="space-y-4 !rounded-2xl border-white/20 dark:border-white/10 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Pose Dilemma to The Council
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Options</span>
          </button>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
            placeholder="Present a strategic dilemma, architectural fork, or ethical trade-off..."
            rows={4}
            maxLength={2000}
            className="w-full p-3.5 text-sm rounded-xl bg-black/2 dark:bg-white/3 border border-black/5 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none transition-all"
          />

          <div className="flex items-center justify-between pt-1 px-1">
            <span className="text-[11px] text-gray-400 font-mono">
              {query.length} / 2000
            </span>
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              Press ⌘+Enter to submit
            </span>
          </div>
        </div>

        {/* Sensitive Topic Advisory Callout */}
        {sensitiveCheck?.isSensitive && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <span className="font-semibold block">Sensitive Topic Detected</span>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                {sensitiveCheck.advisoryMessage}
              </p>
            </div>
          </div>
        )}

        {/* Advanced Options Accordion */}
        {showAdvanced && (
          <div className="p-3.5 rounded-xl bg-black/3 dark:bg-white/3 border border-black/5 dark:border-white/5 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200 block">
                  Simulation Mode (Mock LLM)
                </span>
                <span className="text-[11px] text-gray-500">
                  Runs zero-cost deterministic mock debate without calling Gemini API
                </span>
              </div>
              <input
                type="checkbox"
                checked={mockMode}
                onChange={(e) => setMockMode(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
              <div>
                <span className="font-medium text-gray-800 dark:text-gray-200 block">
                  Cross-Exam Rounds
                </span>
                <span className="text-[11px] text-gray-500">
                  Maximum debate rounds (1 to 6)
                </span>
              </div>
              <select
                value={maxRounds}
                onChange={(e) => setMaxRounds(parseInt(e.target.value, 10))}
                className="bg-white/80 dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 text-xs outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Round' : 'Rounds'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="xs">
              8 Personas + Moderator
            </Badge>
            {mockMode && (
              <Badge variant="warning" size="xs">
                Mock Mode
              </Badge>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={isSubmitDisabled}
            onClick={() => handleSubmit()}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Convene Council
          </Button>
        </div>
      </GlassCard>

      {/* Suggested Dilemma Prompt Chips */}
      <div className="space-y-2">
        <span className="text-[11px] uppercase font-mono tracking-wider text-gray-400 block px-1">
          Or Select Archetypal Dilemma:
        </span>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_PROMPTS.map((promptText, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(promptText)}
              className="text-left text-xs px-3 py-2 rounded-xl glass-panel-subtle hover:bg-black/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors border border-black/5 dark:border-white/5 active:scale-[0.99]"
            >
              &ldquo;{promptText}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

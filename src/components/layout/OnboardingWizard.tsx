'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Sparkles,
  Scale,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Compass,
  Cpu,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [keyResult, setKeyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mockMode, setMockMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('the_council_gemini_api_key') || '';
      setApiKey(stored);
      setStep(1);
      setKeyResult(null);
    }
  }, [isOpen]);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setKeyResult({ success: false, message: 'Please enter a valid API key string' });
      return;
    }

    setTestingKey(true);
    setKeyResult(null);

    try {
      const res = await fetch('/api/v1/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setKeyResult({
          success: true,
          message: `Connection verified! Model: ${data.data?.model || 'gemini-2.5-flash'} (${data.data?.latencyMs || 0}ms)`,
        });
        localStorage.setItem('the_council_gemini_api_key', apiKey.trim());
      } else {
        setKeyResult({
          success: false,
          message: data.error?.message || 'API key validation failed. Please verify in Google AI Studio.',
        });
      }
    } catch (err: any) {
      setKeyResult({
        success: false,
        message: err.message || 'Network error while testing key',
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('the_council_onboarding_completed', 'true');
    if (mockMode) {
      localStorage.setItem('the_council_mock_mode', 'true');
    }
    onComplete?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to The Council"
    >
      <div className="w-full max-w-lg glass-panel-elevated shadow-2xl rounded-2xl overflow-hidden border border-white/20 dark:border-white/10 flex flex-col">
        {/* Wizard Header */}
        <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                Welcome to The Council
              </h2>
              <span className="text-[11px] text-gray-400">Step {step} of 3</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Body Steps */}
        <div className="p-6 flex-1 min-h-[280px]">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Autonomous Multi-Agent Deliberation
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                The Council convenes <strong>8 specialized cognitive perspectives</strong> led by a neutral <strong>Moderator</strong>. Unlike single-shot LLM prompts, The Council debates complex dilemmas through structured cross-examination, iterative critique, and convergence evaluation.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px]">
                  <strong className="text-indigo-600 dark:text-indigo-400 block">Skeptic & Optimist</strong>
                  <span className="text-gray-500">Rigorous stress-testing vs agency</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px]">
                  <strong className="text-indigo-600 dark:text-indigo-400 block">Ethicist & Pragmatist</strong>
                  <span className="text-gray-500">Moral axioms vs execution friction</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                The Strict Honesty Rule
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                The Council operates under a binding architectural invariant: <strong>unanimity is never fabricated</strong>. If irreducible philosophical differences or conflicting axioms persist, the system produces a dignified <strong>Consensus Not Fully Reached</strong> verdict.
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Epistemic Integrity:</strong> You will always see exactly which personas shifted position, the catalyst arguments that persuaded them, and where genuine dissent remains.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Engine & API Key Setup
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Provide your Google Gemini API key to activate live multi-model deliberations, or toggle Mock Simulation Mode for instant zero-cost experimentation.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block">
                  Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/70 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white font-mono"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={testingKey}
                    onClick={handleTestKey}
                  >
                    Test Key
                  </Button>
                </div>

                {keyResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      keyResult.success
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {keyResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 shrink-0" />
                    )}
                    <span>{keyResult.message}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Or explore in Mock Simulation Mode:
                </span>
                <button
                  type="button"
                  onClick={() => setMockMode(!mockMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    mockMode
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-black/5 dark:border-white/10'
                  }`}
                >
                  {mockMode ? 'Simulation Active' : 'Enable Simulation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between bg-black/2 dark:bg-white/2">
          {step > 1 ? (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="sm"
              variant="primary"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              rightIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleFinish}
            >
              Enter The Chamber
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

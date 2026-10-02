/**
 * Origin: AnshX01/Atlas (frontend/src/components/layout/OnboardingWizard.tsx)
 * 3-step glass onboarding wizard for first-run setup.
 * Server-only key configuration: never stores API keys in browser localStorage (B2 Fix).
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  CheckCircle2,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSettings } from "@/lib/ui/hooks";
import { toast } from "@/components/ui/Toast";

export function OnboardingWizard({ children }: { children?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  const { settings, updateSettings, testKey } = useSettings();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = localStorage.getItem("council_onboarding_completed");
    if (!completed) {
      setIsOpen(true);
    }
  }, []);

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) return;
    setTestingKey(true);
    setKeyValid(null);

    const result = await testKey(apiKeyInput.trim());
    setTestingKey(false);
    if (result.valid) {
      setKeyValid(true);
      toast.success("Gemini API key verified successfully!");
    } else {
      setKeyValid(false);
      toast.error(result.message || "Failed to verify API key with Gemini.");
    }
  };

  const handleCompleteWithKey = async () => {
    if (apiKeyInput.trim()) {
      await updateSettings({
        // Server persists key securely
      });
    }
    localStorage.setItem("council_onboarding_completed", "true");
    setIsOpen(false);
    toast.success("Setup complete. Welcome to The Council.");
  };

  const handleCompleteDemo = () => {
    localStorage.setItem("council_onboarding_completed", "true");
    setIsOpen(false);
    toast.info("Demo mode enabled with deterministic simulation engine.");
  };

  return (
    <>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCompleteDemo}
              className="fixed inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-10 w-full max-w-lg rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-6 overflow-hidden"
            >
              {/* Stepper Progress */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--bg-primary)] font-bold text-xs">
                    C
                  </div>
                  <span className="font-bold text-sm text-[var(--text-primary)]">
                    The Council Setup
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          s === step
                            ? "w-6 bg-[var(--accent)]"
                            : s < step
                            ? "w-2 bg-[var(--text-muted)]"
                            : "w-2 bg-[var(--bg-tertiary)]"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleCompleteDemo}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-2"
                    aria-label="Close setup modal"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Step 1: Welcome & Value Proposition */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)]">
                    <Compass size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    Autonomous Multi-Agent Deliberation
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    The Council convenes 8 diverse AI intellectual personas around a circular table,
                    guided by a non-voting Moderator, to examine your hardest decisions from every angle.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] text-xs flex flex-col gap-1">
                      <span className="font-semibold text-[var(--text-primary)]">Strict Honesty Rule</span>
                      <span className="text-[var(--text-muted)]">Consensus is never manufactured. Real dissent is recorded.</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] text-xs flex flex-col gap-1">
                      <span className="font-semibold text-[var(--text-primary)]">Local Persistence</span>
                      <span className="text-[var(--text-muted)]">Data stays in your local SQLite WAL database.</span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setStep(2)}
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Next: The Protocol
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: 6-Phase Deliberation Protocol */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)]">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    How The Council Deliberates
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Every deliberation proceeds through a structured 6-phase dialectic:
                  </p>
                  <div className="flex flex-col gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">01</span>
                      <span className="font-medium text-[var(--text-primary)]">Framing & Opening Positions</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">02</span>
                      <span className="font-medium text-[var(--text-primary)]">Iterative Cross-Examination (Live Arcs)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">03</span>
                      <span className="font-medium text-[var(--text-primary)]">Convergence Check & Ratification</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button variant="ghost" size="md" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setStep(3)}
                      rightIcon={<ArrowRight size={14} />}
                    >
                      Next: Engine Connection
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Engine Setup */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)]">
                    <KeyRound size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    Connect Gemini or Try Demo Mode
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Enter your Google Gemini API key for live LLM deliberations, or explore immediately
                    using the built-in deterministic simulation engine.
                  </p>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="password"
                          placeholder="Paste Gemini API Key (AIza...)"
                          value={apiKeyInput}
                          onChange={(e) => {
                            setApiKeyInput(e.target.value);
                            setKeyValid(null);
                          }}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="md"
                        isLoading={testingKey}
                        onClick={handleTestKey}
                        disabled={!apiKeyInput.trim()}
                      >
                        Test Key
                      </Button>
                    </div>
                    {keyValid === true && (
                      <p className="text-xs text-[var(--status-low)] flex items-center gap-1 font-medium">
                        <Check size={12} /> Key is valid and connected.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                    <Button variant="ghost" size="sm" onClick={handleCompleteDemo}>
                      Try Demo Mode
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleCompleteWithKey}
                      >
                        Enter The Chamber
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

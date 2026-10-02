/**
 * Origin: AnshX01/Atlas (frontend/src/app/settings/page.tsx)
 * The Council - Chamber Settings & Controls
 * Flat, borderless, monochrome, Inter-spaced, left sub-navigation layout.
 * Eliminates client localStorage API key leaks (Bug B2) and uses server truth (B3/B4).
 */

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  DollarSign,
  Sun,
  Moon,
  Database,
  Keyboard,
  Info,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { toast } from "@/components/ui/Toast";
import { useSettings, useEngineStatus } from "@/lib/ui/hooks";
import { cn } from "@/lib/utils";

type SettingsSection = "engine" | "budget" | "appearance" | "data" | "shortcuts" | "about";

interface SectionItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionItem[] = [
  { id: "engine", label: "Engine & Models", icon: <Cpu size={15} /> },
  { id: "budget", label: "Budget & Limits", icon: <DollarSign size={15} /> },
  { id: "appearance", label: "Appearance", icon: <Sun size={15} /> },
  { id: "data", label: "Data & Storage", icon: <Database size={15} /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard size={15} /> },
  { id: "about", label: "About", icon: <Info size={15} /> },
];

function SettingRow({
  label,
  description,
  children,
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-4 border-b border-[var(--border-subtle)] last:border-0", className)}>
      <div className="flex-1 pr-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("engine");
  const { settings, updateSettings, testKey } = useSettings();
  const engineStatus = useEngineStatus();

  const [mounted, setMounted] = useState(false);
  const [testProbeKey, setTestProbeKey] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Usage statistics from server
  const [usage, setUsage] = useState<{
    monthlySpendUSD: number;
    monthlySpendCapUSD: number;
    remainingHeadroomUSD: number;
    utilizationPercent: number;
    totalCalls: number;
    totalPromptTokens: number;
    totalCandidateTokens: number;
  }>({
    monthlySpendUSD: 0,
    monthlySpendCapUSD: 20,
    remainingHeadroomUSD: 20,
    utilizationPercent: 0,
    totalCalls: 0,
    totalPromptTokens: 0,
    totalCandidateTokens: 0,
  });

  useEffect(() => {
    setMounted(true);
    fetch("/api/v1/usage")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data?.usage) {
          setUsage(d.data.usage);
        }
      })
      .catch(() => {});
  }, []);

  const handleTestKeyProbe = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await testKey(testProbeKey ? testProbeKey.trim() : undefined);
      setTestResult({
        valid: res.valid ?? false,
        message: res.message || (res.valid ? "Key verified successfully." : "Key verification failed."),
      });
      if (res.valid) {
        toast.success("Gemini API connection verified");
        engineStatus.refresh();
      } else {
        toast.error(res.message || "Verification probe failed");
      }
    } catch (err: any) {
      setTestResult({ valid: false, message: err.message || "Failed to reach test endpoint." });
      toast.error("Network error testing key");
    } finally {
      setTestingKey(false);
    }
  };

  const isDark = mounted ? document.documentElement.classList.contains("dark") : true;

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    updateSettings({ theme: next });
    toast.info(`Theme set to ${next} mode`);
  };

  return (
    <div className="max-w-4xl mx-auto py-2">
      {/* Page Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">
            System Configuration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configure Gemini engine connectivity, safety limits, visual appearance, and storage parameters.
        </p>
      </motion.div>

      {/* Main Container: Left Sub-Nav + Right Content Surface */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Sub-Nav */}
        <motion.nav
          className="flex md:flex-col gap-1 w-full md:w-48 flex-shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          aria-label="Settings sections"
        >
          {SECTIONS.map((sec) => {
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                id={`settings-nav-${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all duration-150 whitespace-nowrap",
                  active
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
                )}
              >
                <span className={active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
                  {sec.icon}
                </span>
                <span>{sec.label}</span>
                {active && <ChevronRight size={12} className="ml-auto hidden md:block text-[var(--text-muted)]" />}
              </button>
            );
          })}
        </motion.nav>

        {/* Right Content Panel */}
        <motion.div
          key={activeSection}
          className="flex-1 rounded-2xl bg-[var(--bg-secondary)] p-6 min-w-0"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* SECTION 1: Engine & Models */}
          {activeSection === "engine" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Engine & Reasoning
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Manage provider connectivity, primary dialectic model, and simulation fallbacks.
                </p>
              </div>

              {/* Server Key Status Banner */}
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="text-[var(--text-primary)] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        Google Gemini Credential
                      </span>
                      <Badge
                        variant={engineStatus.keyConfigured ? "low" : "medium"}
                        size="sm"
                      >
                        {engineStatus.keyConfigured ? "Configured on Server" : "Simulation Mode Active"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                      {engineStatus.keyConfigured
                        ? "API key is loaded strictly in server-side Node.js environment (.env.local). It is never sent to the browser bundle."
                        : "No server GEMINI_API_KEY detected. The chamber runs with deterministic, zero-cost MockProvider archetypes."}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleTestKeyProbe}
                  isLoading={testingKey}
                >
                  Verify Health
                </Button>
              </div>

              {/* Ephemeral Key Verification Probe */}
              <div className="space-y-2 pt-2">
                <Input
                  label="Test Alternate Key (Server Verification Only)"
                  type="password"
                  placeholder="Paste AIzaSy... to test connectivity without saving to browser"
                  value={testProbeKey}
                  onChange={(e) => setTestProbeKey(e.target.value)}
                  rightElement={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleTestKeyProbe}
                      isLoading={testingKey}
                      disabled={!testProbeKey.trim()}
                    >
                      Test
                    </Button>
                  }
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Keys are validated against the server-side health probe and never persisted to browser localStorage.
                </p>

                {testResult && (
                  <div
                    className={cn(
                      "p-3 rounded-xl text-xs flex items-center gap-2.5 mt-2",
                      testResult.valid
                        ? "bg-[var(--status-low)]/10 text-[var(--status-low)]"
                        : "bg-[var(--status-urgent)]/10 text-[var(--status-urgent)]"
                    )}
                  >
                    {testResult.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Model Select */}
              <div className="pt-2">
                <label className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase block mb-1.5">
                  Default Reasoning Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Fast, multi-turn synthesis (Recommended)" },
                    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Deep dialectic reasoning & complex policy" },
                    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", desc: "Lightweight fallback tier" },
                    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", desc: "Legacy long-context model" },
                  ].map((m) => {
                    const isSelected = settings.defaultModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          updateSettings({ defaultModel: m.id });
                          toast.success(`Default model set to ${m.name}`);
                        }}
                        className={cn(
                          "flex flex-col text-left p-3 rounded-xl transition-all duration-150",
                          isSelected
                            ? "bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)]"
                            : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--text-primary)]">
                            {m.name}
                          </span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />}
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          {m.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Budget & Limits */}
          {activeSection === "budget" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Budget & Session Limits
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Set safety spend caps and control the maximum depth of council rounds.
                </p>
              </div>

              {/* Usage & Headroom Summary Card */}
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    Monthly Spend Headroom
                  </span>
                  <Badge variant={usage.utilizationPercent > 80 ? "urgent" : "low"} size="sm">
                    {usage.utilizationPercent}% Used
                  </Badge>
                </div>

                <div className="w-full h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(usage.utilizationPercent, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Spent</span>
                    <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                      ${usage.monthlySpendUSD.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Cap</span>
                    <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                      ${settings.monthlySpendCapUSD.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block">Calls</span>
                    <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                      {usage.totalCalls.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-5 pt-2">
                <Slider
                  label="Monthly Spend Cap ($ USD)"
                  unit=" USD"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.monthlySpendCapUSD}
                  onChange={(val) => updateSettings({ monthlySpendCapUSD: val })}
                  description="Hard ceiling. Sessions will refuse to initiate when spend reaches this cap."
                />

                <Slider
                  label="Max Cross-Examination Rounds"
                  unit=" rounds"
                  min={1}
                  max={8}
                  step={1}
                  value={settings.maxCrossExamRounds}
                  onChange={(val) => updateSettings({ maxCrossExamRounds: val })}
                  description="Number of dialectic debate cycles between personas before forcing synthesis."
                />

                <Slider
                  label="Max Ratification Cycles"
                  unit=" cycles"
                  min={1}
                  max={5}
                  step={1}
                  value={settings.maxRatificationCycles}
                  onChange={(val) => updateSettings({ maxRatificationCycles: val })}
                  description="Maximum voting attempts to reach supermajority consensus on the verdict."
                />
              </div>
            </div>
          )}

          {/* SECTION 3: Appearance */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Appearance & Motion
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Customize the interface theme and visual dynamics.
                </p>
              </div>

              <div className="space-y-1">
                <SettingRow
                  label="Color Theme"
                  description="Toggle between pure Atlas Black and crisp monochrome Light mode."
                >
                  <button
                    id="settings-theme-toggle"
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                  >
                    {isDark ? <Moon size={14} /> : <Sun size={14} />}
                    <span className="capitalize">{isDark ? "Dark" : "Light"}</span>
                  </button>
                </SettingRow>

                <SettingRow
                  label="Reduced Motion"
                  description="Disable spring animations and physics-based transitions for accessibility."
                >
                  <Toggle
                    checked={settings.enableReducedMotion}
                    onChange={(checked) => updateSettings({ enableReducedMotion: checked })}
                  />
                </SettingRow>

                <SettingRow
                  label="3D Disc Tilt"
                  description="Enable subtle cursor-reactive perspective tilt on the circular Round Table."
                >
                  <Toggle
                    checked={settings.enable3DTilt}
                    onChange={(checked) => updateSettings({ enable3DTilt: checked })}
                  />
                </SettingRow>
              </div>
            </div>
          )}

          {/* SECTION 4: Data & Storage */}
          {activeSection === "data" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Data & Local Storage
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  SQLite database configuration, durable runner state, and export tools.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    Local Database Engine
                  </span>
                  <Badge variant="low" size="sm">
                    SQLite WAL Active
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  The Council stores all deliberations, append-only event streams, and spend ledgers in a private, local SQLite database with Write-Ahead Logging for high concurrency.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <SettingRow
                  label="Durable Task Runner"
                  description="Multi-worker background supervisor for long-running multi-turn deliberations."
                >
                  <Badge variant={engineStatus.runnerActive ? "low" : "urgent"} size="sm">
                    {engineStatus.runnerActive ? "Active" : "Stopped"}
                  </Badge>
                </SettingRow>

                <SettingRow
                  label="Local Network (LAN) Sharing"
                  description="Allow trusted devices on the local subnet to view the deliberation chamber."
                >
                  <Toggle
                    checked={settings.enableLAN}
                    onChange={(checked) => updateSettings({ enableLAN: checked })}
                  />
                </SettingRow>
              </div>
            </div>
          )}

          {/* SECTION 5: Shortcuts */}
          {activeSection === "shortcuts" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Keyboard Shortcuts
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Navigate The Council rapidly with keyboard commands.
                </p>
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {[
                  { keys: ["⌘K", "Ctrl+K"], action: "Open Command Palette" },
                  { keys: ["N"], action: "New Deliberation" },
                  { keys: ["G", "H"], action: "Go to History" },
                  { keys: ["G", "S"], action: "Go to Settings" },
                  { keys: ["T"], action: "Toggle Theme (Dark / Light)" },
                  { keys: ["Esc"], action: "Close Dialogs / Drawers" },
                ].map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3">
                    <span className="text-xs text-[var(--text-primary)]">{s.action}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[11px] font-mono text-[var(--text-secondary)]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: About */}
          {activeSection === "about" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  About The Council
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Autonomous dialectic reasoning system with Atlas-grade interface.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--text-primary)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    The Council v2.0
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  An adversarial multi-agent dialectic chamber where 8 specialized personas deliberate complex trade-offs under the guidance of a neutral Moderator. Built to pair seamlessly with Atlas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Design DNA</span>
                  <span className="text-xs font-medium text-[var(--text-primary)] mt-1 block">
                    Atlas-Grade Monochrome
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-primary)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Storage</span>
                  <span className="text-xs font-medium text-[var(--text-primary)] mt-1 block">
                    Local-First SQLite
                  </span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

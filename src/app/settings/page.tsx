'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  KeyRound,
  DollarSign,
  Cpu,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  Save,
  Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [mockMode, setMockMode] = useState(false);
  const [spendCapCents, setSpendCapCents] = useState(1000); // $10.00
  const [concurrency, setConcurrency] = useState(4);
  const [callBudget, setCallBudget] = useState(80);

  // Usage stats from API
  const [usage, setUsage] = useState<{
    totalCostCents: number;
    spendCapCents: number;
    headroomCents: number;
    totalTokens: number;
    callCount: number;
  }>({
    totalCostCents: 0,
    spendCapCents: 1000,
    headroomCents: 1000,
    totalTokens: 0,
    callCount: 0,
  });

  const [testingKey, setTestingKey] = useState(false);
  const [keyResult, setKeyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // 1. Load local preferences
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('the_council_gemini_api_key') || '';
      const storedModel = localStorage.getItem('the_council_gemini_model') || 'gemini-2.5-flash';
      const storedMock = localStorage.getItem('the_council_mock_mode') === 'true';
      setApiKey(storedKey);
      setModel(storedModel);
      setMockMode(storedMock);
    }

    // 2. Fetch server settings and usage
    fetch('/api/v1/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          if (d.data.model) setModel(d.data.model);
          if (d.data.mockMode !== undefined) setMockMode(d.data.mockMode);
          if (d.data.spendCapCents) setSpendCapCents(d.data.spendCapCents);
          if (d.data.concurrencyLimit) setConcurrency(d.data.concurrencyLimit);
          if (d.data.callBudget) setCallBudget(d.data.callBudget);
        }
      })
      .catch(() => {});

    fetch('/api/v1/usage')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          const u = d.data.usage || d.data;
          setUsage({
            totalCostCents: Math.round((u.monthlySpendUSD ?? 0) * 100),
            spendCapCents: Math.round((u.monthlySpendCapUSD ?? 10) * 100),
            headroomCents: Math.round((u.remainingHeadroomUSD ?? 10) * 100),
            totalTokens:
              (u.totalPromptTokens ?? 0) + (u.totalCandidateTokens ?? 0) ||
              (u.totalTokens ?? 0),
            callCount: u.totalCalls ?? u.callCount ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setKeyResult({ success: false, message: 'Please enter a Gemini API Key to test.' });
      return;
    }

    setTestingKey(true);
    setKeyResult(null);

    try {
      const res = await fetch('/api/v1/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), model }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setKeyResult({
          success: true,
          message: `Connection successful! Latency: ${data.data?.latencyMs || 0}ms (${data.data?.model || model})`,
        });
        localStorage.setItem('the_council_gemini_api_key', apiKey.trim());
      } else {
        setKeyResult({
          success: false,
          message: data.error?.message || 'Key test failed.',
        });
      }
    } catch (err: any) {
      setKeyResult({ success: false, message: err.message });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('the_council_gemini_api_key', apiKey.trim());
      localStorage.setItem('the_council_gemini_model', model);
      localStorage.setItem('the_council_mock_mode', String(mockMode));

      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          mockMode,
          spendCapCents,
          concurrencyLimit: concurrency,
          callBudget,
        }),
      });

      if (res.ok) {
        toast({
          type: 'success',
          title: 'Settings Saved',
          description: 'Chamber preferences and spend budget updated.',
        });
      }
    } catch (err: any) {
      toast({ type: 'error', title: 'Save Failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const spendPercent = Math.min(
    100,
    Math.round((usage.totalCostCents / (spendCapCents || 1000)) * 100)
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-gray-50">
              Chamber Settings & Controls
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure Google Gemini credentials, budget spend caps, and execution concurrency.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          isLoading={isSaving}
          onClick={handleSaveSettings}
          leftIcon={<Save className="w-3.5 h-3.5" />}
        >
          Save Changes
        </Button>
      </div>

      {/* Spend Cap & Usage Headroom Meter */}
      <GlassCard padded="md" className="space-y-3 !rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Personal Spend Budget & Usage Meter
            </h2>
          </div>
          <Badge variant={spendPercent > 85 ? 'warning' : 'success'} size="xs">
            {spendPercent}% Cap Used
          </Badge>
        </div>

        {/* Headroom Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-3 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spendPercent > 90 ? 'bg-rose-500' : spendPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${spendPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
            <span>
              Spent: ${((usage?.totalCostCents ?? 0) / 100).toFixed(2)}
            </span>
            <span>
              Cap: ${((spendCapCents ?? 1000) / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-black/2 dark:bg-white/3 border border-black/5 dark:border-white/5">
            <span className="text-[10px] uppercase font-mono text-gray-400 block">Total Tokens Processed</span>
            <span className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
              {(usage?.totalTokens ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-black/2 dark:bg-white/3 border border-black/5 dark:border-white/5">
            <span className="text-[10px] uppercase font-mono text-gray-400 block">LLM Calls Executed</span>
            <span className="text-base font-bold font-mono text-gray-900 dark:text-gray-100">
              {(usage?.callCount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* API Key & Model Configuration */}
      <GlassCard padded="md" className="space-y-4 !rounded-2xl">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Google Gemini Engine Credentials
          </h2>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
            Google Gemini API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-black/3 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-gray-900 dark:text-gray-100"
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
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{keyResult.message}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
              Default Reasoning Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/3 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none text-gray-900 dark:text-gray-100"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Dialectics)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
              Monthly Budget Spend Cap ($ USD)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={spendCapCents / 100}
              onChange={(e) => setSpendCapCents(Math.round(parseFloat(e.target.value || '0') * 100))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/3 dark:bg-white/5 border border-black/10 dark:border-white/10 outline-none text-gray-900 dark:text-gray-100 font-mono"
            />
          </div>
        </div>

        {/* Mock Mode Toggle */}
        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 block">
              Simulation Mode (Zero API Calls)
            </span>
            <span className="text-[11px] text-gray-500">
              Run council deliberations deterministically using local archetype test doubles.
            </span>
          </div>
          <input
            type="checkbox"
            checked={mockMode}
            onChange={(e) => setMockMode(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
        </div>
      </GlassCard>

      {/* Execution Limits */}
      <GlassCard padded="md" className="space-y-4 !rounded-2xl">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Concurrency & Session Bounds
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Concurrency Limit ({concurrency} workers)
            </label>
            <input
              type="range"
              min={1}
              max={8}
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              LLM Call Budget ({callBudget} calls max)
            </label>
            <input
              type="range"
              min={20}
              max={160}
              step={10}
              value={callBudget}
              onChange={(e) => setCallBudget(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

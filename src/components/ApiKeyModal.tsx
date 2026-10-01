'use client';

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertTriangle, Cpu, RefreshCw, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (key: string, model: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.5-flash');
  const [maxRounds, setMaxRounds] = useState<number>(3);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [serverModel, setServerModel] = useState('gemini-3.5-flash');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    ok: boolean;
    message: string;
    modelId?: string;
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Check local storage and migrate legacy deprecated models
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('the_council_gemini_api_key') || '';
      let storedModel = localStorage.getItem('the_council_gemini_model') || 'gemini-3.5-flash';
      if (
        storedModel === 'gemini-2.5-flash' ||
        storedModel === 'gemini-2.0-flash' ||
        storedModel === 'gemini-1.5-flash' ||
        storedModel === 'gemini-1.5-pro'
      ) {
        storedModel = 'gemini-3.5-flash';
        localStorage.setItem('the_council_gemini_model', storedModel);
      }
      setApiKey(storedKey);
      setModel(storedModel);

      const storedRounds = localStorage.getItem('the_council_max_rounds');
      if (storedRounds) {
        const parsed = parseInt(storedRounds, 10);
        if (!isNaN(parsed)) {
          setMaxRounds(Math.min(8, Math.max(1, parsed)));
        }
      }
    }

    // Check server health/key status
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasServerApiKey) {
          setHasServerKey(true);
          if (data.serverModel) setServerModel(data.serverModel);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidate = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest && !hasServerKey) {
      setValidationResult({
        ok: false,
        message: 'Please enter a Gemini API key or configure GEMINI_API_KEY on the server.',
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await fetch('/api/gemini/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest, modelId: model }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setValidationResult({
          ok: true,
          message: `Connected successfully to Google Gemini (${data.modelId}, ${data.latencyMs}ms)`,
          modelId: data.modelId,
        });
        if (data.modelId) setModel(data.modelId);
        toast({
          type: 'success',
          title: 'Connection Validated',
          description: `Ready for live deliberation with ${data.modelId}`,
        });
      } else {
        const errorMsg = data.error || 'Failed to authenticate with Google Gemini.';
        const hint =
          errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('API key')
            ? ' Note: Google AI Studio keys begin with "AIzaSy...".'
            : '';
        setValidationResult({
          ok: false,
          message: `${errorMsg}${hint}`,
        });
        toast({
          type: 'error',
          title: 'Validation Failed',
          description: errorMsg,
        });
      }
    } catch (err: any) {
      setValidationResult({
        ok: false,
        message: err.message || 'Validation request failed.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      if (apiKey.trim()) {
        localStorage.setItem('the_council_gemini_api_key', apiKey.trim());
      } else {
        localStorage.removeItem('the_council_gemini_api_key');
      }
      localStorage.setItem('the_council_gemini_model', model);
      localStorage.setItem('the_council_max_rounds', String(maxRounds));
    }

    toast({
      type: 'success',
      title: 'Engine Settings Applied',
      description: `Model set to ${model}. Max ${maxRounds} rounds.`,
    });

    if (onSave) {
      onSave(apiKey.trim(), model);
    }

    onClose();
  };

  const handleClear = () => {
    setApiKey('');
    setValidationResult(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('the_council_gemini_api_key');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showTrafficLights
      maxWidth="md"
      ariaLabelledBy="api-key-modal-title"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 id="api-key-modal-title" className="font-serif font-bold text-base sm:text-lg text-gray-950 dark:text-gray-50 leading-tight">
              Gemini Engine Settings
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-sans font-normal mt-0.5">
              Configure live Google Gemini AI for all council deliberations
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Server Status Indicator */}
        <div className="p-3.5 rounded-[14px] border border-gray-200/70 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Server Environment:
            </span>
            {hasServerKey ? (
              <Badge variant="success" size="xs" icon={<CheckCircle className="w-3 h-3" />}>
                GEMINI_API_KEY Configured ({serverModel})
              </Badge>
            ) : (
              <Badge variant="warning" size="xs" icon={<AlertTriangle className="w-3 h-3" />}>
                No Server Key (Simulation Fallback)
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {hasServerKey
              ? 'The server is already running with an active Gemini API key. You do not need to provide an individual key unless you wish to override.'
              : 'Provide your personal Google Gemini API key below to unlock authentic multi-agent deliberation for all your queries.'}
          </p>
        </div>

        {/* API Key Form */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-[12px] border border-gray-200/90 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Key is stored securely in your browser session.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Get key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Gemini Model ID
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] border border-gray-200/90 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="gemini-3.5-flash">gemini-3.5-flash (Recommended - Ultra Fast & Capable)</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (High-Throughput Fallback)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Balanced Speed)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (High Intelligence Reasoning)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Max Cross-Examination Rounds
              </label>
              <Badge variant="accent" size="xs">
                {maxRounds} {maxRounds === 1 ? 'round' : 'rounds'} (up to 8)
              </Badge>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={maxRounds}
              onChange={(e) => setMaxRounds(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-gray-200 dark:bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
              <span>1 (Fastest)</span>
              <span>3 (Default)</span>
              <span>8 (Deepest Deliberation)</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Deliberation continues round-by-round until unanimous outcome agreement or this round ceiling is reached.
            </p>
          </div>

          {/* Validation Feedback */}
          {validationResult && (
            <div
              className={`p-3 rounded-[12px] border text-xs leading-relaxed ${
                validationResult.ok
                  ? 'border-emerald-500/25 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                  : 'border-red-500/25 bg-red-50/70 dark:bg-red-950/30 text-red-800 dark:text-red-300'
              }`}
            >
              <p className="font-semibold">{validationResult.message}</p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-gray-200/60 dark:border-white/10 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleValidate}
            disabled={isValidating || (!apiKey.trim() && !hasServerKey)}
            isLoading={isValidating}
            loadingText="Testing Key..."
            leftIcon={<Cpu className="w-3.5 h-3.5" />}
          >
            Test Connection
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              Save & Apply
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

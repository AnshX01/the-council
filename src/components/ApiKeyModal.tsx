'use client';

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertTriangle, X, Shield, Cpu, RefreshCw, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (key: string, model: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.5-flash');
  const [hasServerKey, setHasServerKey] = useState(false);
  const [serverModel, setServerModel] = useState('gemini-3.5-flash');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    ok: boolean;
    message: string;
    modelId?: string;
  } | null>(null);

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
    }

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl p-6 sm:p-7 overflow-hidden text-gray-900 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 id="api-key-modal-title" className="font-serif text-lg font-bold">
                Gemini Engine Settings
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure live Google Gemini AI for all council deliberations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Status Indicator */}
        <div className="my-4 p-3 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-850/40 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Server Environment:
            </span>
            {hasServerKey ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>GEMINI_API_KEY Configured ({serverModel})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>No Server Key (Simulation Fallback)</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {hasServerKey
              ? 'The server is already running with an active Gemini API key. You do not need to provide an individual key unless you wish to override.'
              : 'Provide your personal Google Gemini API key below to unlock authentic multi-agent deliberation for all your queries.'}
          </p>
        </div>

        {/* API Key Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400"
              />
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>Key is stored locally in your browser session.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Get a free key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Gemini Model ID
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="gemini-3.5-flash">gemini-3.5-flash (Recommended - Ultra Fast & Capable)</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (High-Throughput Fallback)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Balanced Speed)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (High Intelligence Reasoning)</option>
            </select>
          </div>

          {/* Validation Feedback */}
          {validationResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                validationResult.ok
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                  : 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-800 dark:text-red-300'
              }`}
            >
              <p className="font-semibold">{validationResult.message}</p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={isValidating || (!apiKey.trim() && !hasServerKey)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-smooth disabled:opacity-50"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing Key...</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" />
                <span>Test Connection</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-smooth"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-smooth"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

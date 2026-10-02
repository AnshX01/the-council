/**
 * The Council — Unified Engine Configuration Resolver
 *
 * Origin: Part 1A Single Source of Truth for Live vs Simulation Engine Configuration.
 * Replaces disparate, fragmented checks across components and services.
 * Strictly guards against secret leakage: full keys are never serialized to client or logs.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type EngineMode = 'live' | 'simulation';
export type EngineReason =
  | 'ok'
  | 'no_key'
  | 'placeholder_key'
  | 'forced_mock_env'
  | 'test_env'
  | 'live_failed';
export type KeySource = 'process_env' | 'env_local' | 'none';
export type ModelSource = 'settings' | 'env' | 'default';

export interface EngineConfig {
  mode: EngineMode;
  reason: EngineReason;
  keySource: KeySource;
  keyLast4?: string;
  model: string;
  modelSource: ModelSource;
  /** Internal server-only raw key, never sent to clients or logged */
  apiKey?: string;
}

export const DEFAULT_ENGINE_MODEL = 'gemini-3-flash-preview';

export interface ResolveContext {
  env: Record<string, string | undefined>;
  envLocalContent: string | null;
  storedSettings: { defaultModel?: string } | null;
}

/**
 * Pure engine config resolver for deterministic testing and runtime evaluation.
 */
export function resolveEngineConfigPure(ctx: ResolveContext): EngineConfig {
  const env = ctx.env;
  let rawKey = env.GEMINI_API_KEY?.trim() || '';
  let keySource: KeySource = 'none';

  // Check if .env.local on disk contains GEMINI_API_KEY
  let envLocalKey = '';
  let envLocalModel = '';
  if (ctx.envLocalContent) {
    const lines = ctx.envLocalContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;
      const keyMatch = trimmed.match(/^GEMINI_API_KEY\s*=\s*(.*)$/);
      if (keyMatch) {
        envLocalKey = keyMatch[1].trim().replace(/^["']|["']$/g, '');
      }
      const modelMatch = trimmed.match(/^GEMINI_MODEL\s*=\s*(.*)$/);
      if (modelMatch) {
        envLocalModel = modelMatch[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  if (rawKey) {
    if (envLocalKey && rawKey === envLocalKey) {
      keySource = 'env_local';
    } else {
      keySource = 'process_env';
    }
  } else if (envLocalKey) {
    rawKey = envLocalKey;
    keySource = 'env_local';
  }

  // Model resolution precedence: modern stored settings > env > env.local > default
  let model = DEFAULT_ENGINE_MODEL;
  let modelSource: ModelSource = 'default';

  const storedModel = ctx.storedSettings?.defaultModel?.trim();
  const isLegacyStored =
    storedModel === 'gemini-2.5-flash' ||
    storedModel?.includes('1.5') ||
    storedModel?.includes('2.0');

  if (storedModel && !isLegacyStored) {
    model = storedModel;
    modelSource = 'settings';
  } else if (env.GEMINI_MODEL && env.GEMINI_MODEL.trim()) {
    model = env.GEMINI_MODEL.trim();
    modelSource = 'env';
  } else if (envLocalModel && envLocalModel.trim()) {
    model = envLocalModel.trim();
    modelSource = 'env';
  } else if (storedModel && isLegacyStored) {
    // Auto-upgrade legacy default to 3.8-flash
    model = DEFAULT_ENGINE_MODEL;
    modelSource = 'settings';
  }

  // Determine key validity and mode
  let mode: EngineMode = 'simulation';
  let reason: EngineReason = 'no_key';

  const isPlaceholder =
    rawKey.length > 0 &&
    (rawKey.includes('your_gemini') ||
      rawKey === 'your_gemini_api_key_here' ||
      rawKey.length <= 5);

  const keyLast4 = rawKey && !isPlaceholder && rawKey.length >= 4 ? rawKey.slice(-4) : undefined;

  if (!rawKey) {
    mode = 'simulation';
    reason = 'no_key';
  } else if (isPlaceholder) {
    mode = 'simulation';
    reason = 'placeholder_key';
  } else if (env.USE_MOCK_PROVIDER === 'true') {
    mode = 'simulation';
    reason = 'forced_mock_env';
  } else if (env.NODE_ENV === 'test' && env.FORCE_LIVE_TEST !== 'true') {
    mode = 'simulation';
    reason = 'test_env';
  } else {
    mode = 'live';
    reason = 'ok';
  }

  return {
    mode,
    reason,
    keySource,
    keyLast4,
    model,
    modelSource,
    apiKey: rawKey || undefined,
  };
}

let lastLoggedFingerprint = '';

/**
 * Reads .env.local file content safely from process root if it exists.
 */
function readEnvLocalContent(): string | null {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      return fs.readFileSync(envLocalPath, 'utf-8');
    }
  } catch {
    // Non-fatal
  }
  return null;
}

/**
 * Resolves current engine configuration using live environment and persistent settings.
 */
export function resolveEngineConfig(): EngineConfig {
  const envLocalContent = readEnvLocalContent();

  // If process.env.GEMINI_API_KEY is unset but .env.local has it, populate process.env
  if (!process.env.GEMINI_API_KEY && envLocalContent) {
    const keyMatch = envLocalContent.match(/^GEMINI_API_KEY\s*=\s*(.*)$/m);
    if (keyMatch) {
      const parsedKey = keyMatch[1].trim().replace(/^["']|["']$/g, '');
      if (parsedKey) {
        process.env.GEMINI_API_KEY = parsedKey;
      }
    }
  }

  // Load stored settings from DB if available
  let storedSettings: { defaultModel?: string } | null = null;
  try {
    // Dynamic require to prevent circular dependency
    const { SettingsRepository } = require('@/lib/storage/repository');
    const repo = new SettingsRepository();
    const settings = repo.getSettings();
    if (settings) {
      storedSettings = settings;
    }
  } catch {
    // DB not ready or running outside Next/Node context
  }

  const config = resolveEngineConfigPure({
    env: process.env as Record<string, string | undefined>,
    envLocalContent,
    storedSettings,
  });

  // Log resolution once per state change (masking secrets)
  const fingerprint = `${config.mode}:${config.reason}:${config.model}:${config.keyLast4 || 'none'}`;
  if (fingerprint !== lastLoggedFingerprint && process.env.NODE_ENV !== 'test') {
    lastLoggedFingerprint = fingerprint;
    console.info(
      `[EngineResolver] Mode: ${config.mode.toUpperCase()} (reason: ${config.reason}, model: ${config.model} [${config.modelSource}], key: ${config.keyLast4 ? `••••${config.keyLast4}` : 'none'} from ${config.keySource})`
    );
  }

  return config;
}

/**
 * Mask an API key to last 4 characters.
 */
export function maskKey(key?: string): string | undefined {
  if (!key || key.length < 4) return undefined;
  return `••••${key.slice(-4)}`;
}

/**
 * Persist an API key atomically to .env.local and update running environment.
 * Never logs or commits the key.
 */
export async function saveApiKeyToServer(apiKey: string, modelId?: string): Promise<{
  ok: boolean;
  keyLast4: string;
  keySource: KeySource;
  model: string;
}> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey || trimmedKey.length <= 5) {
    throw new Error('Invalid API key format');
  }

  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  let existingContent = '';
  let isCRLF = false;

  if (fs.existsSync(envLocalPath)) {
    existingContent = fs.readFileSync(envLocalPath, 'utf-8');
    isCRLF = existingContent.includes('\r\n');
  }

  const eol = isCRLF ? '\r\n' : '\n';
  const lines = existingContent ? existingContent.split(/\r?\n/) : [];

  let keyUpdated = false;
  let modelUpdated = false;
  const newLines: string[] = [];

  for (const line of lines) {
    if (line.match(/^GEMINI_API_KEY\s*=/)) {
      newLines.push(`GEMINI_API_KEY=${trimmedKey}`);
      keyUpdated = true;
    } else if (modelId && line.match(/^GEMINI_MODEL\s*=/)) {
      newLines.push(`GEMINI_MODEL=${modelId.trim()}`);
      modelUpdated = true;
    } else {
      newLines.push(line);
    }
  }

  if (!keyUpdated) {
    newLines.push(`GEMINI_API_KEY=${trimmedKey}`);
  }
  if (modelId && !modelUpdated) {
    newLines.push(`GEMINI_MODEL=${modelId.trim()}`);
  }

  const outputContent = newLines.join(eol) + (newLines.length > 0 && !newLines[newLines.length - 1].endsWith('\n') ? eol : '');

  // Atomic write: write to temp file then rename
  const tempPath = path.resolve(process.cwd(), `.env.local.tmp.${crypto.randomUUID()}`);
  fs.writeFileSync(tempPath, outputContent, 'utf-8');
  fs.renameSync(tempPath, envLocalPath);

  // Update in-memory environment immediately
  process.env.GEMINI_API_KEY = trimmedKey;
  if (modelId) {
    process.env.GEMINI_MODEL = modelId.trim();
  }

  const newConfig = resolveEngineConfig();

  return {
    ok: true,
    keyLast4: trimmedKey.slice(-4),
    keySource: 'env_local',
    model: newConfig.model,
  };
}

/**
 * Remove API key from .env.local and in-memory environment.
 */
export async function removeApiKeyFromServer(): Promise<{ ok: boolean }> {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');

  if (fs.existsSync(envLocalPath)) {
    const existingContent = fs.readFileSync(envLocalPath, 'utf-8');
    const isCRLF = existingContent.includes('\r\n');
    const eol = isCRLF ? '\r\n' : '\n';
    const lines = existingContent.split(/\r?\n/);
    const newLines = lines.filter((line) => !line.match(/^GEMINI_API_KEY\s*=/));

    const tempPath = path.resolve(process.cwd(), `.env.local.tmp.${crypto.randomUUID()}`);
    fs.writeFileSync(tempPath, newLines.join(eol), 'utf-8');
    fs.renameSync(tempPath, envLocalPath);
  }

  delete process.env.GEMINI_API_KEY;
  resolveEngineConfig();

  return { ok: true };
}

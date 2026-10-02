/**
 * Tests for Engine and Key Settings Routes (Part 1B & 1E)
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getReady } from '@/app/api/v1/health/ready/route';
import { GET as getModels } from '@/app/api/v1/engine/models/route';
import { POST as postKey, DELETE as deleteKey } from '@/app/api/v1/settings/key/route';

describe('Engine & Key Settings API Routes', () => {
  it('GET /api/v1/health/ready returns engine status with masked keyLast4 and no raw apiKey', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/health/ready');
    const res = await getReady(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe('ready');
    expect(json.data.engine).toBeDefined();
    expect(json.data.engine.mode).toBeDefined();
    expect(json.data.engine.model).toBeDefined();
    expect(json.data.engine.apiKey).toBeUndefined(); // Strictly no secret leakage!

    // Backwards compatibility probe
    expect(json.data.probes.gemini).toBeDefined();
  });

  it('GET /api/v1/engine/models returns list of valid modern models', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/engine/models');
    const res = await getModels(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.models)).toBe(true);
    expect(json.data.models.length).toBeGreaterThan(0);

    const modelIds = json.data.models.map((m: any) => m.id);
    expect(modelIds.some((id: string) => id.includes('flash'))).toBe(true);
    // Asserts no legacy 1.5 models
    expect(modelIds.every((id: string) => !id.includes('1.5'))).toBe(true);
  });

  it('POST /api/v1/settings/key rejects malformed short keys', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/settings/key', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'too-short' }),
    });
    const res = await postKey(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe('VALIDATION_FAILED');
  });

  it('POST /api/v1/settings/key rejects invalid fake API keys with clear error code', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/settings/key', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'AIzaSyFakeKeyInvalidFormatForTesting12345' }),
    });
    const res = await postKey(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBeDefined();
  });
});

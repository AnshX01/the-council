/**
 * The Council - API Contract & OpenAPI Drift Tests
 *
 * Verifies that the implementation matches docs/openapi.yaml and that all
 * endpoints conform strictly to standard success and error envelope contracts.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET as getLiveHealth } from '@/app/api/v1/health/live/route';
import { GET as getReadyHealth } from '@/app/api/v1/health/ready/route';
import { GET as getSettings } from '@/app/api/v1/settings/route';
import { GET as getUsage } from '@/app/api/v1/usage/route';
import { POST as createSession } from '@/app/api/v1/sessions/route';

describe('API Contract & OpenAPI Drift Verification', () => {
  it('docs/openapi.yaml exists and documents all core v1 endpoints', () => {
    const specPath = path.resolve(process.cwd(), 'docs', 'openapi.yaml');
    expect(fs.existsSync(specPath)).toBe(true);

    const content = fs.readFileSync(specPath, 'utf8');
    const requiredEndpoints = [
      '/sessions',
      '/sessions/{id}',
      '/sessions/{id}/stream',
      '/sessions/{id}/cancel',
      '/sessions/{id}/rerun',
      '/sessions/{id}/export',
      '/settings',
      '/settings/test-key',
      '/usage',
      '/health/live',
      '/health/ready',
    ];

    for (const ep of requiredEndpoints) {
      expect(content).toContain(ep);
    }
  });

  it('all successful responses conform to { data, requestId } envelope and contain x-request-id header', async () => {
    const endpoints = [
      { name: 'GET /health/live', handler: () => getLiveHealth(new NextRequest('http://localhost:3000/api/v1/health/live')) },
      { name: 'GET /health/ready', handler: () => getReadyHealth(new NextRequest('http://localhost:3000/api/v1/health/ready')) },
      { name: 'GET /settings', handler: () => getSettings(new NextRequest('http://localhost:3000/api/v1/settings')) },
      { name: 'GET /usage', handler: () => getUsage(new NextRequest('http://localhost:3000/api/v1/usage')) },
    ];

    for (const ep of endpoints) {
      const res = await ep.handler();
      expect(res.status).toBe(200);
      expect(res.headers.get('x-request-id')).toBeTruthy();

      const json = await res.json();
      expect(json).toHaveProperty('data');
      expect(json).toHaveProperty('requestId');
      expect(typeof json.requestId).toBe('string');
    }
  });

  it('all error responses conform to { error: { code, message, requestId } } envelope', async () => {
    const badReq = new NextRequest('http://localhost:3000/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'x' }), // Validation failure
    });

    const res = await createSession(badReq);
    expect(res.status).toBe(422);
    expect(res.headers.get('x-request-id')).toBeTruthy();

    const json = await res.json();
    expect(json).toHaveProperty('error');
    expect(json.error).toHaveProperty('code');
    expect(json.error).toHaveProperty('message');
    expect(json.error).toHaveProperty('requestId');
    expect(typeof json.error.code).toBe('string');
    expect(typeof json.error.message).toBe('string');
  });
});

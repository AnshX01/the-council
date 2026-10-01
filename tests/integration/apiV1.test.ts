/**
 * The Council - API v1 Comprehensive Integration Tests
 *
 * Verifies all API v1 endpoints:
 * - /api/v1/sessions (GET, POST)
 * - /api/v1/sessions/[id] (GET, PATCH, DELETE)
 * - /api/v1/sessions/[id]/stream (SSE resumable replay)
 * - /api/v1/sessions/[id]/cancel (POST)
 * - /api/v1/sessions/[id]/rerun (POST)
 * - /api/v1/sessions/[id]/export (GET md, json, txt)
 * - /api/v1/settings (GET, PATCH)
 * - /api/v1/settings/test-key (POST)
 * - /api/v1/usage (GET)
 * - /api/v1/health/live & /api/v1/health/ready (GET)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createSessionV1, GET as listSessionsV1 } from '@/app/api/v1/sessions/route';
import {
  GET as getSessionV1,
  PATCH as patchSessionV1,
  DELETE as deleteSessionV1,
} from '@/app/api/v1/sessions/[id]/route';
import { POST as cancelSessionV1 } from '@/app/api/v1/sessions/[id]/cancel/route';
import { POST as rerunSessionV1 } from '@/app/api/v1/sessions/[id]/rerun/route';
import { GET as exportSessionV1 } from '@/app/api/v1/sessions/[id]/export/route';
import { GET as streamSessionV1 } from '@/app/api/v1/sessions/[id]/stream/route';
import { GET as getSettingsV1, PATCH as patchSettingsV1 } from '@/app/api/v1/settings/route';
import { POST as testKeyV1 } from '@/app/api/v1/settings/test-key/route';
import { GET as getUsageV1 } from '@/app/api/v1/usage/route';
import { GET as liveHealthV1 } from '@/app/api/v1/health/live/route';
import { GET as readyHealthV1 } from '@/app/api/v1/health/ready/route';
import { SessionRepository, EventRepository, SettingsRepository } from '@/lib/storage/repository';
import { getDatabase } from '@/lib/storage/db';

describe('API v1 Suite', () => {
  let sessionRepo: SessionRepository;
  let eventRepo: EventRepository;

  beforeEach(() => {
    sessionRepo = new SessionRepository();
    eventRepo = new EventRepository();
  });

  describe('Health Probes', () => {
    it('GET /api/v1/health/live returns liveness status', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/health/live');
      const res = await liveHealthV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('ok');
      expect(json.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/v1/health/ready returns database readiness', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/health/ready');
      const res = await readyHealthV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('ready');
      expect(json.data.database).toBe('ok');
    });
  });

  describe('Settings API', () => {
    it('GET /api/v1/settings returns validated defaults', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/settings');
      const res = await getSettingsV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.settings).toBeDefined();
      expect(json.data.settings.defaultModel).toBeDefined();
      expect(json.data.settings.monthlySpendCapUSD).toBeGreaterThan(0);
    });

    it('PATCH /api/v1/settings updates settings safely', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxCrossExamRounds: 4,
          theme: 'light',
        }),
      });
      const res = await patchSettingsV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.settings.maxCrossExamRounds).toBe(4);
      expect(json.data.settings.theme).toBe('light');

      // Reset back to dark
      new SettingsRepository().updateSettings({ theme: 'dark', maxCrossExamRounds: 3 });
    });

    it('POST /api/v1/settings/test-key validates without echoing secret', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'invalid_dummy_key_12345' }),
      });
      const res = await testKeyV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(typeof json.data.valid).toBe('boolean');
      // Secret must not be in response body
      expect(JSON.stringify(json)).not.toContain('invalid_dummy_key_12345');
    });
  });

  describe('Usage API', () => {
    it('GET /api/v1/usage returns spend meter and stats', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/usage');
      const res = await getUsageV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.usage).toBeDefined();
      expect(typeof json.data.usage.monthlySpendUSD).toBe('number');
      expect(typeof json.data.usage.monthlySpendCapUSD).toBe('number');
      expect(typeof json.data.usage.remainingHeadroomUSD).toBe('number');
    });
  });

  describe('Sessions API Lifecycle', () => {
    let createdSessionId = '';

    it('POST /api/v1/sessions validates and enqueues a session', async () => {
      const testKey = `idem_key_${Math.random().toString(36).slice(2)}`;
      const req = new NextRequest('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': testKey,
        },
        body: JSON.stringify({
          query: 'Should AI assistants operate under a strict local-first paradigm?',
          options: {
            mockMode: true,
            maxCrossExamRounds: 1,
            maxRatificationCycles: 1,
          },
          tags: ['ethics', 'architecture'],
        }),
      });

      const res = await createSessionV1(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.session).toBeDefined();
      expect(json.data.session.id).toBeDefined();
      expect(json.data.session.status).toBe('QUEUED');
      createdSessionId = json.data.session.id;

      // Idempotency replay with the same key
      const replayReq = new NextRequest('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': testKey,
        },
        body: JSON.stringify({
          query: 'Should AI assistants operate under a strict local-first paradigm?',
        }),
      });

      const replayRes = await createSessionV1(replayReq);
      expect(replayRes.status).toBe(200);
      const replayJson = await replayRes.json();
      expect(replayJson.data.isIdempotentReplay).toBe(true);
      expect(replayJson.data.session.id).toBe(createdSessionId);
    });

    it('POST /api/v1/sessions rejects invalid queries', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'no' }), // too short (<3 chars)
      });
      const res = await createSessionV1(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });

    it('GET /api/v1/sessions lists sessions with pagination', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/sessions?limit=5');
      const res = await listSessionsV1(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.sessions)).toBe(true);
      expect(json.data.limit).toBe(5);
    });

    it('GET /api/v1/sessions/:id returns session details', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}`);
      const res = await getSessionV1(req, { params: Promise.resolve({ id: createdSessionId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.session.id).toBe(createdSessionId);
    });

    it('PATCH /api/v1/sessions/:id updates metadata', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated AI Local-First Dilemma',
          pinned: true,
        }),
      });
      const res = await patchSessionV1(req, { params: Promise.resolve({ id: createdSessionId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.session.title).toBe('Updated AI Local-First Dilemma');
      expect(json.data.session.pinned).toBe(true);
    });

    it('POST /api/v1/sessions/:id/rerun clones into a new session', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}/rerun`, {
        method: 'POST',
      });
      const res = await rerunSessionV1(req, { params: Promise.resolve({ id: createdSessionId }) });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.session.id).not.toBe(createdSessionId);
      expect(json.data.originalSessionId).toBe(createdSessionId);
      expect(json.data.session.status).toBe('QUEUED');
    });

    it('GET /api/v1/sessions/:id/export exports Markdown, JSON, and text', async () => {
      // 1. Export md
      const mdReq = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}/export?format=md`);
      const mdRes = await exportSessionV1(mdReq, { params: Promise.resolve({ id: createdSessionId }) });
      expect(mdRes.status).toBe(200);
      expect(mdRes.headers.get('content-type')).toContain('text/markdown');
      const mdText = await mdRes.text();
      expect(mdText).toContain('# The Council: Deliberation Record');

      // 2. Export json
      const jsonReq = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}/export?format=json`);
      const jsonRes = await exportSessionV1(jsonReq, { params: Promise.resolve({ id: createdSessionId }) });
      expect(jsonRes.status).toBe(200);
      expect(jsonRes.headers.get('content-type')).toContain('application/json');

      // 3. Export txt
      const txtReq = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}/export?format=txt`);
      const txtRes = await exportSessionV1(txtReq, { params: Promise.resolve({ id: createdSessionId }) });
      expect(txtRes.status).toBe(200);
      expect(txtRes.headers.get('content-type')).toContain('text/plain');
    });

    it('GET /api/v1/sessions/:id/stream opens SSE stream and replays events', async () => {
      const streamId = `sess_stream_${Math.random().toString(36).slice(2)}`;
      sessionRepo.createSession({
        id: streamId,
        title: 'Stream Unit Test',
        query: 'Query for testing streaming replay',
        options: {},
      });

      eventRepo.appendEvent(streamId, 0, 'phase_started', {
        phase: 'PHASE_0_FRAMING',
        phaseIndex: 0,
        description: 'Test Framing',
      });

      const req = new NextRequest(`http://localhost:3000/api/v1/sessions/${streamId}/stream?after=-1`);
      const res = await streamSessionV1(req, { params: Promise.resolve({ id: streamId }) });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');

      // Read initial chunk from stream
      const reader = res.body?.getReader();
      expect(reader).toBeDefined();
      const chunk = await reader?.read();
      const text = new TextDecoder().decode(chunk?.value);
      expect(text).toContain('phase_started');
      expect(text).toContain('Test Framing');
      reader?.cancel();
    });

    it('POST /api/v1/sessions/:id/cancel stops session', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}/cancel`, {
        method: 'POST',
      });
      const res = await cancelSessionV1(req, { params: Promise.resolve({ id: createdSessionId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('CANCELLED');
    });

    it('DELETE /api/v1/sessions/:id soft-deletes session', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}`, {
        method: 'DELETE',
      });
      const res = await deleteSessionV1(req, { params: Promise.resolve({ id: createdSessionId }) });
      expect(res.status).toBe(200);

      // Verify no longer accessible via get
      const getReq = new NextRequest(`http://localhost:3000/api/v1/sessions/${createdSessionId}`);
      const getRes = await getSessionV1(getReq, { params: Promise.resolve({ id: createdSessionId }) });
      expect(getRes.status).toBe(404);
    });
  });
});

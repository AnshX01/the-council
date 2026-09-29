/**
 * The Council - API Endpoints & SSE Streaming Integration Tests
 *
 * Verifies POST /api/sessions, GET /api/sessions/[id],
 * GET /api/sessions/[id]/stream (SSE), and GET /api/health.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createSessionRoute, GET as listSessionsRoute } from '@/app/api/sessions/route';
import { GET as getSessionRoute } from '@/app/api/sessions/[id]/route';
import { GET as streamSessionRoute } from '@/app/api/sessions/[id]/stream/route';
import { GET as healthRoute } from '@/app/api/health/route';
import { sessionStore } from '@/lib/storage/memoryStore';

describe('API Route Handlers', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('GET /api/health', () => {
    it('returns healthy status and provider metadata', async () => {
      const response = await healthRoute();
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('healthy');
      expect(json.provider).toBeDefined();
      expect(json.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('POST /api/sessions', () => {
    it('creates a session with valid query and returns 201 with sessionId', async () => {
      const req = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Should an autonomous hospital algorithm prioritize younger patients during an ICU crisis?',
          options: {
            mockMode: true,
            maxCrossExamRounds: 1,
            maxRatificationCycles: 1,
          },
        }),
      });

      const response = await createSessionRoute(req);
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json.sessionId).toBeDefined();
      expect(typeof json.sessionId).toBe('string');
      expect(json.status).toBe('PHASE_0_FRAMING');

      // Verify stored in memoryStore
      const stored = sessionStore.getSession(json.sessionId);
      expect(stored).toBeDefined();
      expect(stored?.sessionId).toBe(json.sessionId);
    });

    it('rejects query that is too short (< 10 chars) with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Too short' }),
      });

      const response = await createSessionRoute(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe('Invalid session request');
      expect(json.details?.query).toBeDefined();
    });

    it('rejects query exceeding 2000 characters with 400 Bad Request', async () => {
      const longQuery = 'A'.repeat(2005);
      const req = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: longQuery }),
      });

      const response = await createSessionRoute(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBe('Invalid session request');
      expect(json.details?.query).toBeDefined();
    });

    it('rejects empty body or non-JSON input cleanly', async () => {
      const req = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await createSessionRoute(req);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/sessions/[id]', () => {
    it('returns full snapshot for an existing session', async () => {
      // Create session first
      const createReq = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Should universities replace tenure with 5-year renewable contracts?',
          options: { mockMode: true },
        }),
      });
      const createRes = await createSessionRoute(createReq);
      const { sessionId } = await createRes.json();

      // Query session snapshot
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}`);
      const response = await getSessionRoute(req, {
        params: Promise.resolve({ id: sessionId }),
      });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.session).toBeDefined();
      expect(json.session.sessionId).toBe(sessionId);
      expect(json.events).toBeInstanceOf(Array);
    });

    it('returns 404 for non-existent session ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/sessions/non-existent-id');
      const response = await getSessionRoute(req, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.error).toBe('Session not found');
    });
  });

  describe('GET /api/sessions/[id]/stream (SSE)', () => {
    it('returns 404 if streaming non-existent session', async () => {
      const req = new NextRequest('http://localhost:3000/api/sessions/unknown/stream');
      const response = await streamSessionRoute(req, {
        params: Promise.resolve({ id: 'unknown' }),
      });
      expect(response.status).toBe(404);
    });

    it('returns text/event-stream headers and replays historical events', async () => {
      // 1. Create session
      const createReq = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Should autonomous vehicles prioritize passengers over pedestrians in unavoidable collisions?',
          options: { mockMode: true },
        }),
      });
      const createRes = await createSessionRoute(createReq);
      const { sessionId } = await createRes.json();

      // 2. Add an event to session store
      sessionStore.addEvent(sessionId, {
        event: 'phase_started',
        sessionId,
        timestamp: new Date().toISOString(),
        payload: {
          phase: 'PHASE_0_FRAMING',
          phaseIndex: 0,
          description: 'Framing dilemma',
        },
      });

      // 3. Connect to SSE stream
      const req = new NextRequest(`http://localhost:3000/api/sessions/${sessionId}/stream`);
      const response = await streamSessionRoute(req, {
        params: Promise.resolve({ id: sessionId }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
      expect(response.headers.get('Cache-Control')).toContain('no-cache');

      // 4. Read first chunk from stream
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      const chunk = await reader!.read();
      expect(chunk.done).toBe(false);

      const text = new TextDecoder().decode(chunk.value);
      expect(text).toContain('event: phase_started');
      expect(text).toContain('PHASE_0_FRAMING');

      await reader!.cancel();
    });
  });

  describe('POST /api/gemini/validate', () => {
    it('rejects short or empty API key with 400', async () => {
      const { POST: validateRoute } = await import('@/app/api/gemini/validate/route');
      const req = new NextRequest('http://localhost:3000/api/gemini/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'short' }),
      });

      const response = await validateRoute(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('too short');
    });
  });
});

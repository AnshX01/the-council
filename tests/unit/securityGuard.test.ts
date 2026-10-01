import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { validateLocalhostRequest } from '@/lib/api/securityGuard';

describe('Localhost Security Guard (src/lib/api/securityGuard.ts)', () => {
  it('allows loopback host requests on localhost and 127.0.0.1', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/sessions', {
      headers: { host: 'localhost:3000' },
    });
    const result = validateLocalhostRequest(req, 'req_1');
    expect(result).toBeNull();
  });

  it('rejects external or malicious Host headers with 403', async () => {
    const req = new NextRequest('http://evil.com/api/v1/sessions', {
      headers: { host: 'evil.attacker.com' },
    });
    const result = validateLocalhostRequest(req, 'req_2');
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    const json = await result?.json();
    expect(json.error.code).toBe('FORBIDDEN_HOST');
  });

  it('rejects cross-origin POST requests from malicious external websites', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/sessions', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'https://malicious-tracker.xyz',
      },
    });
    const result = validateLocalhostRequest(req, 'req_3');
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
    const json = await result?.json();
    expect(json.error.code).toBe('CROSS_ORIGIN_FORBIDDEN');
  });

  it('allows loopback origin for state-changing operations', () => {
    const req = new NextRequest('http://localhost:3000/api/v1/sessions', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    const result = validateLocalhostRequest(req, 'req_4');
    expect(result).toBeNull();
  });
});

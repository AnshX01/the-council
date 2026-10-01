import { describe, it, expect } from 'vitest';
import { createErrorEnvelope, apiErrorResponse, apiSuccessResponse } from '@/lib/api/error';

describe('API Error Envelope & Response Helpers', () => {
  it('creates standard error envelope structure matching specs', () => {
    const envelope = createErrorEnvelope(
      'SESSION_NOT_FOUND',
      'The requested deliberation session does not exist.',
      'req_test_123',
      { id: 'sess_999' }
    );

    expect(envelope).toEqual({
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'The requested deliberation session does not exist.',
        requestId: 'req_test_123',
        details: { id: 'sess_999' },
      },
    });
  });

  it('generates NextResponse with correct status and headers', async () => {
    const res = apiErrorResponse('INVALID_QUERY', 'Query cannot be empty', 422, 'req_err_1');
    expect(res.status).toBe(422);
    expect(res.headers.get('x-request-id')).toBe('req_err_1');

    const json = await res.json();
    expect(json.error.code).toBe('INVALID_QUERY');
    expect(json.error.message).toBe('Query cannot be empty');
    expect(json.error.requestId).toBe('req_err_1');
  });

  it('generates success response with data and requestId', async () => {
    const res = apiSuccessResponse({ active: true }, 200, 'req_ok_1');
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('req_ok_1');

    const json = await res.json();
    expect(json.data).toEqual({ active: true });
    expect(json.requestId).toBe('req_ok_1');
  });
});

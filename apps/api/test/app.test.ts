import type { SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

const makeClient = (user: { id: string; role: string } | null, error: Error | null = null): SupabaseClient => ({
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error }) },
} as unknown as SupabaseClient);

describe('API foundation', () => {
  it('returns the safe health envelope', async () => {
    const response = await request(createApp(makeClient(null))).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' }, error: null });
  });

  it('rejects missing and malformed bearer tokens', async () => {
    const app = createApp(makeClient(null));
    for (const authorization of [undefined, 'Basic token', 'Bearer ']) {
      const result = request(app).get('/api/v1/authenticated');
      if (authorization) result.set('Authorization', authorization);
      const response = await result;
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' } });
    }
  });

  it('uses the verified token identity and ignores request user input', async () => {
    const response = await request(createApp(makeClient({ id: 'verified-user', role: 'authenticated' })))
      .get('/api/v1/authenticated?userId=attacker')
      .set('Authorization', 'Bearer verified-token');
    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBe('verified-user');
  });

  it('rejects invalid request data after authentication', async () => {
    const response = await request(createApp(makeClient({ id: 'verified-user', role: 'authenticated' })))
      .post('/api/v1/generate-try-on')
      .set('Authorization', 'Bearer verified-token')
      .send({ consentAccepted: false, userId: 'attacker' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ data: null, error: { code: 'INVALID_REQUEST', message: 'The request data is invalid.' } });
  });
});

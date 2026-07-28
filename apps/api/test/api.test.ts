import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { SupabaseAuthService } from '../src/services/supabase-auth-service.js';

const createTestApp = (authService: SupabaseAuthService) => createApp({ authService });

describe('TrueFit API foundation', (): void => {
  it('returns a safe success envelope from the health endpoint', async (): Promise<void> => {
    const app = createTestApp({ getVerifiedUser: async (): Promise<null> => null });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' }, error: null });
  });

  it('rejects a protected endpoint without a bearer token', async (): Promise<void> => {
    const app = createTestApp({ getVerifiedUser: async (): Promise<null> => null });

    const response = await request(app).get('/api/v1/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      data: null,
      error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' },
    });
  });

  it('rejects a malformed bearer token', async (): Promise<void> => {
    const app = createTestApp({ getVerifiedUser: async (): Promise<null> => null });

    const response = await request(app).get('/api/v1/me').set('authorization', 'not-a-bearer-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('uses only the verified identity returned by Supabase', async (): Promise<void> => {
    const app = createTestApp({
      getVerifiedUser: async (): Promise<{ id: string }> => ({ id: 'verified-user-id' }),
    });

    const response = await request(app)
      .get('/api/v1/me')
      .set('authorization', 'Bearer verified-token')
      .query({ userId: 'untrusted-user-id' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { userId: 'verified-user-id' }, error: null });
  });

  it('returns a safe not-found envelope', async (): Promise<void> => {
    const app = createTestApp({ getVerifiedUser: async (): Promise<null> => null });

    const response = await request(app).get('/api/v1/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });
});

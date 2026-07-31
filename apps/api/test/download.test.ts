import sharp from 'sharp';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import { createInMemoryCurrentResultStore } from '../src/services/current-result-store.js';
import { createResultDownloadService, type SavedResultLoader } from '../src/services/result-download-service.js';
import type { SupabaseAuthService } from '../src/services/supabase-auth-service.js';
import { createWatermarkService } from '../src/services/watermark-service.js';

const fitPhysicsNote = {
  summary: 'Moderate confidence with uncertainty from size chart variation.',
  stretch: 'Stretch depends on the listed fabric blend.',
  structure: 'The garment may hold shape through shoulder seams.',
  pressurePoints: ['Shoulders'],
  uncertainty: 'This guidance cannot guarantee exact physical fit.',
  disclaimer: 'Guidance only; not a physical-fit or size guarantee.' as const,
};

const garment = { category: 'top' as const, title: 'Tee', sourceUrl: 'https://example.com/tee' };

const createAuthService = (userId: string): SupabaseAuthService => ({
  getVerifiedUser: async (): Promise<{ id: string }> => ({ id: userId }),
});

const createSourceImage = async (): Promise<Buffer> =>
  sharp({ create: { width: 400, height: 533, channels: 3, background: { r: 210, g: 200, b: 185 } } })
    .jpeg()
    .toBuffer();

const noSavedResults: SavedResultLoader = { loadSavedResult: async (): Promise<Buffer | null> => null };

describe('watermarked result downloads', (): void => {
  it('returns a watermarked jpeg attachment for the owner of a current result', async (): Promise<void> => {
    const source = await createSourceImage();
    const store = createInMemoryCurrentResultStore();
    const stored = store.put({ userId: 'user-1', imageBase64: source.toString('base64'), mimeType: 'image/jpeg', fitPhysicsNote, garment });
    const downloadService = createResultDownloadService(store, noSavedResults, createWatermarkService());
    const app = createApp({ authService: createAuthService('user-1'), downloadService });

    const response = await request(app)
      .get(`/api/v1/try-ons/${stored.id}/download`)
      .set('authorization', 'Bearer verified-token')
      .responseType('blob');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['cache-control']).toContain('no-store');

    const returned = response.body as Buffer;
    const metadata = await sharp(returned).metadata();
    expect(metadata.format).toBe('jpeg');
    // Same pixel dimensions as the source, but re-encoded with the mark burned in.
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(533);
    expect(returned.equals(source)).toBe(false);
  }, 20_000);

  it('does not expose a current result belonging to another user', async (): Promise<void> => {
    const source = await createSourceImage();
    const store = createInMemoryCurrentResultStore();
    const stored = store.put({ userId: 'owner-user', imageBase64: source.toString('base64'), mimeType: 'image/jpeg', fitPhysicsNote, garment });
    const downloadService = createResultDownloadService(store, noSavedResults, createWatermarkService());
    const app = createApp({ authService: createAuthService('other-user'), downloadService });

    const response = await request(app)
      .get(`/api/v1/try-ons/${stored.id}/download`)
      .set('authorization', 'Bearer verified-token');

    expect(response.status).toBe(404);
  }, 20_000);

  it('watermarks a saved result the loader authorises and 404s when it does not', async (): Promise<void> => {
    const source = await createSourceImage();
    const savedTryOnId = '11111111-1111-4111-8111-111111111111';
    const loader: SavedResultLoader = { loadSavedResult: vi.fn(async () => source) };
    const store = createInMemoryCurrentResultStore();
    const app = createApp({
      authService: createAuthService('viewer-user'),
      downloadService: createResultDownloadService(store, loader, createWatermarkService()),
    });

    const allowed = await request(app)
      .get(`/api/v1/wardrobe/${savedTryOnId}/download`)
      .set('authorization', 'Bearer verified-token')
      .responseType('blob');

    expect(allowed.status).toBe(200);
    expect(loader.loadSavedResult).toHaveBeenCalledWith({ userId: 'viewer-user', savedTryOnId });
    expect((await sharp(allowed.body as Buffer).metadata()).format).toBe('jpeg');

    const deniedApp = createApp({
      authService: createAuthService('viewer-user'),
      downloadService: createResultDownloadService(store, noSavedResults, createWatermarkService()),
    });
    const denied = await request(deniedApp)
      .get(`/api/v1/wardrobe/${savedTryOnId}/download`)
      .set('authorization', 'Bearer verified-token');

    expect(denied.status).toBe(404);
  }, 20_000);
});

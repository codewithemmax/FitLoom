import { readFile } from 'node:fs/promises';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import type { SafeSearchOutcome, SafeSearchService } from '../src/services/safe-search-service.js';
import { createInMemoryCurrentResultStore } from '../src/services/current-result-store.js';
import type { FitNoteService } from '../src/services/fit-note-service.js';
import { createTryOnOrchestrationService, type TryOnOrchestrationService } from '../src/services/try-on-orchestration-service.js';
import type { SupabaseAuthService } from '../src/services/supabase-auth-service.js';
import type { YouCamClient } from '../src/vendor/youcam-client.js';

const authService: SupabaseAuthService = {
  getVerifiedUser: async (): Promise<{ id: string }> => ({ id: 'verified-user-id' }),
};

const imageBuffer = Buffer.from('fixture-image');

const fitPhysicsNote = {
  summary: 'This should fit with moderate confidence and some uncertainty.',
  stretch: 'The fabric may provide limited stretch depending on blend.',
  structure: 'The garment structure may hold shape around seams.',
  pressurePoints: ['Shoulders may feel closer if layered.'],
  uncertainty: 'Actual fit can vary by pattern, size chart, and posture.',
  disclaimer: 'Guidance only; not a physical-fit or size guarantee.' as const,
};

const createFitNoteService = (): FitNoteService => ({
  createFitNote: vi.fn(async () => fitPhysicsNote),
});

const createTryOnService = (safeSearch: SafeSearchService, youCamClient: YouCamClient): TryOnOrchestrationService =>
  createTryOnOrchestrationService(safeSearch, youCamClient, createFitNoteService(), createInMemoryCurrentResultStore(), {
    pollIntervalMs: 0,
    timeoutMs: 50,
  });

const createSafeSearch = (outcomes: SafeSearchOutcome[]): SafeSearchService => ({
  moderateImage: vi.fn(async (): Promise<SafeSearchOutcome> => outcomes.shift() ?? 'indeterminate'),
});

const createSuccessfulYouCamClient = (): YouCamClient => ({
  createTryOnTask: vi.fn(async (): Promise<{ taskId: string }> => ({ taskId: 'task-1' })),
  getTryOnTask: vi.fn(async (): Promise<{ status: 'succeeded'; result: { imageBuffer: Buffer; mimeType: 'image/png' } }> => ({
    status: 'succeeded',
    result: { imageBuffer, mimeType: 'image/png' },
  })),
});

const sendValidTryOnRequest = (app: ReturnType<typeof createApp>): request.Test =>
  request(app)
    .post('/api/v1/try-ons')
    .set('authorization', 'Bearer verified-token')
    .field('garmentCategory', 'top')
    .field('garmentTitle', 'Linen shirt')
    .field('garmentSourceUrl', 'https://example.com/shirt')
    .field('garmentConfirmed', 'true')
    .attach('basePhoto', imageBuffer, { filename: 'base.png', contentType: 'image/png' })
    .attach('garmentImage', imageBuffer, { filename: 'garment.png', contentType: 'image/png' });

describe('try-on safety orchestration', (): void => {
  it('keeps uploads request-scoped in memory without disk storage', async (): Promise<void> => {
    const uploadSource = await readFile(new URL('../src/middleware/memory-upload.ts', import.meta.url), 'utf8');

    expect(uploadSource).not.toContain('diskStorage');
    expect(uploadSource).not.toContain('createWriteStream');
    expect(uploadSource).not.toContain('writeFile');
  });

  it('rejects unsupported categories and incomplete confirmation before vendor calls', async (): Promise<void> => {
    const youCamClient = createSuccessfulYouCamClient();
    const tryOnService = createTryOnService(createSafeSearch(['safe', 'safe', 'safe']), youCamClient);
    const app = createApp({ authService, tryOnService });

    const response = await request(app)
      .post('/api/v1/try-ons')
      .set('authorization', 'Bearer verified-token')
      .field('garmentCategory', 'pants')
      .field('garmentTitle', 'Pants')
      .field('garmentSourceUrl', 'https://example.com/pants')
      .field('garmentConfirmed', 'false')
      .attach('basePhoto', imageBuffer, { filename: 'base.png', contentType: 'image/png' })
      .attach('garmentImage', imageBuffer, { filename: 'garment.png', contentType: 'image/png' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
    expect(youCamClient.createTryOnTask).not.toHaveBeenCalled();
  });

  it('blocks unsafe or indeterminate input before YouCam is called and cleans buffers', async (): Promise<void> => {
    const youCamClient = createSuccessfulYouCamClient();
    const tryOnService = createTryOnService(createSafeSearch(['safe', 'indeterminate']), youCamClient);
    const input = {
      userId: 'verified-user-id',
      basePhoto: Buffer.from('base'),
      garmentImage: Buffer.from('garment'),
      garmentCategory: 'top' as const,
      metadata: { title: 'Title', sourceUrl: 'https://example.com/item' },
    };

    await expect(tryOnService.generateTryOn(input)).rejects.toMatchObject({ code: 'SAFETY_BLOCKED' });
    expect(youCamClient.createTryOnTask).not.toHaveBeenCalled();
    expect(input.basePhoto.length).toBe(0);
    expect(input.garmentImage.length).toBe(0);
  });

  it('never returns unsafe generated output', async (): Promise<void> => {
    const tryOnService = createTryOnService(createSafeSearch(['safe', 'safe', 'unsafe']), createSuccessfulYouCamClient());
    const app = createApp({ authService, tryOnService });

    const response = await sendValidTryOnRequest(app);

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('SAFETY_BLOCKED');
    expect(response.body.data).toBeNull();
  });

  it('returns a safe timeout envelope when polling exceeds the configured timeout', async (): Promise<void> => {
    const youCamClient: YouCamClient = {
      createTryOnTask: vi.fn(async (): Promise<{ taskId: string }> => ({ taskId: 'task-1' })),
      getTryOnTask: vi.fn(async (): Promise<{ status: 'running' }> => ({ status: 'running' })),
    };
    const tryOnService = createTryOnOrchestrationService(createSafeSearch(['safe', 'safe']), youCamClient, createFitNoteService(), createInMemoryCurrentResultStore(), {
      pollIntervalMs: 1,
      timeoutMs: 2,
    });
    const app = createApp({ authService, tryOnService });

    const response = await sendValidTryOnRequest(app);

    expect(response.status).toBe(504);
    expect(response.body).toEqual({
      data: null,
      error: { code: 'TRY_ON_TIMEOUT', message: 'Try-on generation timed out. Please try again later.' },
    });
  });

  it('allows an approved request through input moderation, YouCam, and output moderation', async (): Promise<void> => {
    const safeSearch = createSafeSearch(['safe', 'safe', 'safe']);
    const youCamClient = createSuccessfulYouCamClient();
    const tryOnService = createTryOnService(safeSearch, youCamClient);
    const app = createApp({ authService, tryOnService });

    const response = await sendValidTryOnRequest(app);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ imageBase64: imageBuffer.toString('base64'), mimeType: 'image/png', fitPhysicsNote });
    expect(response.body.data.resultId).toEqual(expect.any(String));
    expect(response.body.error).toBeNull();
    expect(safeSearch.moderateImage).toHaveBeenCalledTimes(3);
    expect(youCamClient.createTryOnTask).toHaveBeenCalledTimes(1);
    expect(youCamClient.getTryOnTask).toHaveBeenCalledTimes(1);
  });
  it('blocks person photos without a clear face before YouCam is called', async (): Promise<void> => {
    const youCamClient = createSuccessfulYouCamClient();
    const tryOnService = createTryOnOrchestrationService(
      createSafeSearch(['safe', 'safe']),
      youCamClient,
      createFitNoteService(),
      createInMemoryCurrentResultStore(),
      { pollIntervalMs: 0, timeoutMs: 50 },
      { validatePersonPhoto: async () => ({ status: 'rejected', reason: 'no_face_detected' }) },
    );

    await expect(
      tryOnService.generateTryOn({
        userId: 'verified-user-id',
        basePhoto: Buffer.from('random-photo'),
        garmentImages: [Buffer.from('garment')],
        garmentCategory: 'top',
        metadata: { title: 'Title', sourceUrl: 'https://example.com/item' },
      }),
    ).rejects.toMatchObject({ code: 'PERSON_PHOTO_INVALID' });
    expect(youCamClient.createTryOnTask).not.toHaveBeenCalled();
  });

  it('accepts multiple product photos and moderates every product image before generation', async (): Promise<void> => {
    const safeSearch = createSafeSearch(['safe', 'safe', 'safe', 'safe']);
    const youCamClient = createSuccessfulYouCamClient();
    const tryOnService = createTryOnOrchestrationService(
      safeSearch,
      youCamClient,
      createFitNoteService(),
      createInMemoryCurrentResultStore(),
      { pollIntervalMs: 0, timeoutMs: 50 },
      { validatePersonPhoto: async () => ({ status: 'approved' }) },
    );

    const result = await tryOnService.generateTryOn({
      userId: 'verified-user-id',
      basePhoto: Buffer.from('person-photo'),
      garmentImages: [Buffer.from('front-product'), Buffer.from('back-product')],
      garmentCategory: 'top',
      metadata: { title: 'Title', sourceUrl: 'https://example.com/item' },
    });

    expect(result.resultId).toEqual(expect.any(String));
    expect(safeSearch.moderateImage).toHaveBeenCalledTimes(4);
    expect(youCamClient.createTryOnTask).toHaveBeenCalledWith(expect.objectContaining({ garmentImage: Buffer.from('front-product') }));
  });

});

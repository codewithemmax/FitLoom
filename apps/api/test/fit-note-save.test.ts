import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import { createInMemoryCurrentResultStore } from '../src/services/current-result-store.js';
import type { FitNoteInput, FitNoteService } from '../src/services/fit-note-service.js';
import { createTryOnOrchestrationService } from '../src/services/try-on-orchestration-service.js';
import type { SupabaseAuthService } from '../src/services/supabase-auth-service.js';
import { createWardrobeSaveService, type WardrobePersistence } from '../src/services/wardrobe-save-service.js';
import type { SafeSearchOutcome, SafeSearchService } from '../src/services/safe-search-service.js';
import type { YouCamClient } from '../src/vendor/youcam-client.js';

const fitPhysicsNote = {
  summary: 'Moderate confidence with uncertainty from size chart variation.',
  stretch: 'Stretch depends on the listed fabric blend and knit direction.',
  structure: 'The garment may hold shape through shoulder and side seams.',
  pressurePoints: ['Shoulders', 'upper arms'],
  uncertainty: 'This guidance cannot guarantee exact physical fit.',
  disclaimer: 'Guidance only; not a physical-fit or size guarantee.' as const,
};

const imageBuffer = Buffer.from('approved-result');

const createAuthService = (userId: string): SupabaseAuthService => ({
  getVerifiedUser: async (): Promise<{ id: string }> => ({ id: userId }),
});

const sendTryOnRequest = (app: ReturnType<typeof createApp>): request.Test =>
  request(app)
    .post('/api/v1/try-ons')
    .set('authorization', 'Bearer verified-token')
    .field('garmentCategory', 'top')
    .field('garmentTitle', 'Structured tee')
    .field('garmentSourceUrl', 'https://example.com/tee')
    .field('garmentConfirmed', 'true')
    .field('garmentCut', 'relaxed')
    .field('height', '5 ft 8 in')
    .field('usualSize', 'M')
    .field('fitPreferences', 'prefers relaxed shoulders')
    .attach('basePhoto', Buffer.from('base-photo'), { filename: 'base.png', contentType: 'image/png' })
    .attach('garmentImage', Buffer.from('garment-image'), { filename: 'garment.png', contentType: 'image/png' });

describe('fit note and explicit save', (): void => {
  it('calls Gemini fit-note service only with garment metadata and profile fields', async (): Promise<void> => {
    const capturedInputs: FitNoteInput[] = [];
    const fitNoteService: FitNoteService = {
      createFitNote: vi.fn(async (input: FitNoteInput) => {
        capturedInputs.push(input);
        return fitPhysicsNote;
      }),
    };
    const safeSearchService: SafeSearchService = { moderateImage: vi.fn(async (): Promise<SafeSearchOutcome> => 'safe') };
    const youCamClient: YouCamClient = {
      createTryOnTask: vi.fn(async () => ({ taskId: 'task-1' })),
      getTryOnTask: vi.fn(async (): Promise<{ status: 'succeeded'; result: { imageBuffer: Buffer; mimeType: 'image/png' } }> => ({ status: 'succeeded', result: { imageBuffer, mimeType: 'image/png' } })),
    };
    const store = createInMemoryCurrentResultStore();
    const tryOnService = createTryOnOrchestrationService(safeSearchService, youCamClient, fitNoteService, store, {
      pollIntervalMs: 0,
      timeoutMs: 50,
    });
    const app = createApp({ authService: createAuthService('user-1'), tryOnService });

    const response = await sendTryOnRequest(app);

    expect(response.status).toBe(200);
    expect(response.body.data.fitPhysicsNote).toEqual(fitPhysicsNote);
    expect(capturedInputs).toEqual([
      {
        garment: {
          category: 'top',
          title: 'Structured tee',
          sourceUrl: 'https://example.com/tee',
          cut: 'relaxed',
        },
        profile: {
          height: '5 ft 8 in',
          usualSize: 'M',
          fitPreferences: 'prefers relaxed shoulders',
        },
      },
    ]);
    expect(JSON.stringify(capturedInputs)).not.toContain('base-photo');
    expect(JSON.stringify(capturedInputs)).not.toContain('garment-image');
    expect(JSON.stringify(capturedInputs)).not.toContain('approved-result');
  });

  it('does not persist a completed try-on until the user explicitly saves', async (): Promise<void> => {
    const store = createInMemoryCurrentResultStore();
    const persistence: WardrobePersistence = {
      uploadResult: vi.fn(async () => ({ path: 'user-1/try-ons/result.png' })),
      createRecord: vi.fn(async () => ({ id: 'saved-1', resultPath: 'user-1/try-ons/result.png' })),
      removeResult: vi.fn(async () => undefined),
    };
    const tryOnService = createTryOnOrchestrationService(
      { moderateImage: vi.fn(async (): Promise<SafeSearchOutcome> => 'safe') },
      {
        createTryOnTask: vi.fn(async () => ({ taskId: 'task-1' })),
        getTryOnTask: vi.fn(async (): Promise<{ status: 'succeeded'; result: { imageBuffer: Buffer; mimeType: 'image/png' } }> => ({ status: 'succeeded', result: { imageBuffer, mimeType: 'image/png' } })),
      },
      { createFitNote: vi.fn(async () => fitPhysicsNote) },
      store,
      { pollIntervalMs: 0, timeoutMs: 50 },
    );
    const saveService = createWardrobeSaveService(store, persistence);
    const app = createApp({ authService: createAuthService('user-1'), tryOnService, wardrobeSaveService: saveService });

    const generateResponse = await sendTryOnRequest(app);

    expect(generateResponse.status).toBe(200);
    expect(persistence.uploadResult).not.toHaveBeenCalled();
    expect(persistence.createRecord).not.toHaveBeenCalled();

    const saveResponse = await request(app)
      .post('/api/v1/wardrobe')
      .set('authorization', 'Bearer verified-token')
      .send({ resultId: generateResponse.body.data.resultId });

    expect(saveResponse.status).toBe(201);
    expect(saveResponse.body).toEqual({ data: { id: 'saved-1', resultPath: 'user-1/try-ons/result.png' }, error: null });
    expect(persistence.uploadResult).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    expect(persistence.createRecord).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('prevents saving another user result and cleans uploaded storage if record creation fails', async (): Promise<void> => {
    const store = createInMemoryCurrentResultStore();
    const currentResult = store.put({
      userId: 'owner-user',
      imageBase64: imageBuffer.toString('base64'),
      mimeType: 'image/png',
      fitPhysicsNote,
      garment: { category: 'top', title: 'Tee', sourceUrl: 'https://example.com/tee' },
    });
    const persistence: WardrobePersistence = {
      uploadResult: vi.fn(async () => ({ path: 'owner-user/try-ons/result.png' })),
      createRecord: vi.fn(async () => {
        throw new Error('database unavailable');
      }),
      removeResult: vi.fn(async () => undefined),
    };
    const saveService = createWardrobeSaveService(store, persistence);
    const app = createApp({ authService: createAuthService('other-user'), wardrobeSaveService: saveService });

    const forbiddenResponse = await request(app)
      .post('/api/v1/wardrobe')
      .set('authorization', 'Bearer verified-token')
      .send({ resultId: currentResult.id });

    expect(forbiddenResponse.status).toBe(404);
    expect(persistence.uploadResult).not.toHaveBeenCalled();

    await expect(saveService.saveCurrentResult('owner-user', currentResult.id)).rejects.toMatchObject({ code: 'SAVE_FAILED' });
    expect(persistence.removeResult).toHaveBeenCalledWith('owner-user/try-ons/result.png');
  });
});

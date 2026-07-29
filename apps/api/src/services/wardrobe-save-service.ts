import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { AppConfig } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { CurrentResultStore, CurrentTryOnResult } from './current-result-store.js';

export const saveTryOnRequestSchema = z.object({
  resultId: z.string().uuid(),
});

export type SavedWardrobeRecord = {
  id: string;
  resultPath: string;
};

export type WardrobePersistence = {
  uploadResult(input: { userId: string; resultId: string; image: Buffer; contentType: string }): Promise<{ path: string }>;
  createRecord(input: { userId: string; currentResult: CurrentTryOnResult; resultPath: string }): Promise<SavedWardrobeRecord>;
  removeResult(path: string): Promise<void>;
};

export type WardrobeSaveService = {
  saveCurrentResult(userId: string, resultId: string): Promise<SavedWardrobeRecord>;
};

export const createWardrobeSaveService = (store: CurrentResultStore, persistence: WardrobePersistence): WardrobeSaveService => ({
  async saveCurrentResult(userId: string, resultId: string): Promise<SavedWardrobeRecord> {
    const currentResult = store.getForUser(userId, resultId);

    if (currentResult === null) {
      throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
    }

    let uploadedPath: string | undefined;

    try {
      const upload = await persistence.uploadResult({
        userId,
        resultId,
        image: Buffer.from(currentResult.imageBase64, 'base64'),
        contentType: currentResult.mimeType,
      });
      uploadedPath = upload.path;

      const saved = await persistence.createRecord({ userId, currentResult, resultPath: uploadedPath });
      store.deleteForUser(userId, resultId);
      return saved;
    } catch (error: unknown) {
      if (uploadedPath !== undefined) {
        await persistence.removeResult(uploadedPath);
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(502, 'SAVE_FAILED', 'The result could not be saved. Please try again later.');
    }
  },
});

export const createSupabaseWardrobePersistence = (config: AppConfig): WardrobePersistence => {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY ?? config.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    async uploadResult(input): Promise<{ path: string }> {
      const extension = input.contentType.split('/')[1] ?? 'png';
      const path = `${input.userId}/try-ons/${input.resultId}.${extension}`;
      const { error } = await client.storage.from(config.SUPABASE_RESULTS_BUCKET).upload(path, input.image, {
        contentType: input.contentType,
        upsert: false,
      });

      if (error !== null) {
        throw new AppError(502, 'SAVE_FAILED', 'The result could not be saved. Please try again later.');
      }

      return { path };
    },

    async createRecord(input): Promise<SavedWardrobeRecord> {
      const { data, error } = await client
        .from('saved_try_ons')
        .insert({
          user_id: input.userId,
          result_path: input.resultPath,
          garment: input.currentResult.garment,
          fit_physics_note: input.currentResult.fitPhysicsNote,
          source_url: input.currentResult.garment.sourceUrl,
        })
        .select('id,result_path')
        .single();

      if (error !== null || data === null) {
        throw new AppError(502, 'SAVE_FAILED', 'The result could not be saved. Please try again later.');
      }

      return { id: String(data.id), resultPath: String(data.result_path) };
    },

    async removeResult(path: string): Promise<void> {
      await client.storage.from(config.SUPABASE_RESULTS_BUCKET).remove([path]);
    },
  };
};

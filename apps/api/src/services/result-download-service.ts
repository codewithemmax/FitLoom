import { createClient } from '@supabase/supabase-js';

import type { AppConfig } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { CurrentResultStore } from './current-result-store.js';
import type { WatermarkedImage, WatermarkService } from './watermark-service.js';

export type SavedResultLoader = {
  /** Returns null when the result does not exist or the user may not read it. */
  loadSavedResult(input: { userId: string; savedTryOnId: string }): Promise<Buffer | null>;
};

export type ResultDownloadService = {
  downloadCurrentResult(userId: string, resultId: string): Promise<WatermarkedImage>;
  downloadSavedResult(userId: string, savedTryOnId: string): Promise<WatermarkedImage>;
};

export const createResultDownloadService = (
  store: CurrentResultStore,
  loader: SavedResultLoader,
  watermarkService: WatermarkService,
): ResultDownloadService => ({
  async downloadCurrentResult(userId: string, resultId: string): Promise<WatermarkedImage> {
    const current = store.getForUser(userId, resultId);

    if (current === null) {
      throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
    }

    return watermarkService.applyWatermark(Buffer.from(current.imageBase64, 'base64'));
  },

  async downloadSavedResult(userId: string, savedTryOnId: string): Promise<WatermarkedImage> {
    const image = await loader.loadSavedResult({ userId, savedTryOnId });

    if (image === null) {
      throw new AppError(404, 'NOT_FOUND', 'The requested resource was not found.');
    }

    return watermarkService.applyWatermark(image);
  },
});

export const createSupabaseSavedResultLoader = (config: AppConfig): SavedResultLoader => {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY ?? config.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    async loadSavedResult({ userId, savedTryOnId }): Promise<Buffer | null> {
      const { data: row } = await client
        .from('saved_try_ons')
        .select('user_id,result_path')
        .eq('id', savedTryOnId)
        .maybeSingle();

      if (row === null) {
        return null;
      }

      // This client uses the service-role key and therefore bypasses RLS, so the
      // read rule is enforced here: you may download your own result, or anyone's
      // result once it has been published to the community feed.
      if (String(row.user_id) !== userId) {
        const { data: post } = await client
          .from('feed_posts')
          .select('id')
          .eq('saved_try_on_id', savedTryOnId)
          .lte('published_at', new Date().toISOString())
          .maybeSingle();

        if (post === null) {
          return null;
        }
      }

      const { data, error } = await client.storage
        .from(config.SUPABASE_RESULTS_BUCKET)
        .download(String(row.result_path));

      if (error !== null || data === null) {
        return null;
      }

      return Buffer.from(await data.arrayBuffer());
    },
  };
};

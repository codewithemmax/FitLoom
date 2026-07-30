import { z } from 'zod';

import { validateVendorResponse } from '../middleware/validate.js';
import type { YouCamClient, YouCamTaskResult } from './youcam-client.js';

// Perfect Corp S2S API v2.0 — cloth_type values per docs
const toClothType = (category: 'top' | 'outerwear'): string =>
  category === 'outerwear' ? 'outerwear' : 'upper_body';

// POST /s2s/v2.0/task/cloth-v3 response: { data: { task_id: string } }
const createTaskResponseSchema = z.object({
  data: z.object({ task_id: z.string().min(1) }),
}).transform((v) => v.data.task_id);

// GET /s2s/v2.0/task/cloth-v3/:id response: { data: { status, result_image_url? } }
const taskStatusResponseSchema = z.object({
  data: z.object({
    status: z.enum(['pending', 'running', 'succeeded', 'failed']),
    result_image_url: z.string().url().optional(),
  }),
}).transform((v) => v.data);

export const createYouCamHttpClient = (options: { apiKey: string; baseUrl: string }): YouCamClient => ({
  async createTryOnTask(input): Promise<{ taskId: string }> {
    const url = new URL('/s2s/v2.0/task/cloth-v3', options.baseUrl).toString();
    const body = {
      upper_body_image: input.basePhoto.toString('base64'),
      cloth_image: input.garmentImage.toString('base64'),
      cloth_type: toClothType(input.garmentCategory),
    };
    console.debug('[YouCam] createTryOnTask →', url, { cloth_type: body.cloth_type, upper_body_image_bytes: input.basePhoto.length, cloth_image_bytes: input.garmentImage.length });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    console.debug('[YouCam] createTryOnTask ←', response.status, rawText.slice(0, 500));

    if (!response.ok) {
      throw new Error(`YouCam task creation failed: HTTP ${response.status} — ${rawText.slice(0, 200)}`);
    }

    const payload: unknown = JSON.parse(rawText);
    return { taskId: validateVendorResponse(createTaskResponseSchema, payload) };
  },

  async getTryOnTask(taskId: string): Promise<{ status: 'pending' | 'running' } | { status: 'succeeded'; result: YouCamTaskResult } | { status: 'failed' }> {
    const url = new URL(`/s2s/v2.0/task/cloth-v3/${encodeURIComponent(taskId)}`, options.baseUrl).toString();
    console.debug('[YouCam] getTryOnTask →', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${options.apiKey}` },
    });

    const rawText = await response.text();
    console.debug('[YouCam] getTryOnTask ←', response.status, rawText.slice(0, 500));

    if (!response.ok) {
      console.error('[YouCam] getTryOnTask non-OK:', response.status, rawText.slice(0, 200));
      return { status: 'failed' };
    }

    const payload: unknown = JSON.parse(rawText);
    const parsed = validateVendorResponse(taskStatusResponseSchema, payload);

    if (parsed.status === 'succeeded') {
      if (parsed.result_image_url === undefined) {
        console.error('[YouCam] succeeded but result_image_url missing');
        return { status: 'failed' };
      }

      console.debug('[YouCam] downloading result image from', parsed.result_image_url);
      const imageResponse = await fetch(parsed.result_image_url);
      if (!imageResponse.ok) {
        console.error('[YouCam] result image download failed:', imageResponse.status);
        return { status: 'failed' };
      }

      const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg';
      const mimeType = (['image/jpeg', 'image/png', 'image/webp'] as const).find((m) => contentType.includes(m)) ?? 'image/jpeg';
      const arrayBuffer = await imageResponse.arrayBuffer();
      return {
        status: 'succeeded',
        result: { imageBuffer: Buffer.from(arrayBuffer), mimeType },
      };
    }

    return { status: parsed.status };
  },
});

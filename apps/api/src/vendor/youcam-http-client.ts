import { z } from 'zod';

import { validateVendorResponse } from '../middleware/validate.js';
import type { YouCamClient, YouCamTaskResult } from './youcam-client.js';

const createTaskResponseSchema = z.union([
  z.object({ taskId: z.string().min(1) }).transform((value) => value.taskId),
  z.object({ task: z.object({ id: z.string().min(1) }) }).transform((value) => value.task.id),
]);

const taskStatusResponseSchema = z.object({
  status: z.enum(['pending', 'running', 'succeeded', 'failed']),
  result: z
    .object({
      imageBase64: z.string().min(1),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    })
    .optional(),
});

export const createYouCamHttpClient = (options: { apiKey: string; baseUrl: string }): YouCamClient => ({
  async createTryOnTask(input): Promise<{ taskId: string }> {
    const response = await fetch(new URL('/s2s/v2.0/task/cloth-v3', options.baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        personImage: input.basePhoto.toString('base64'),
        garmentImage: input.garmentImage.toString('base64'),
        garmentCategory: input.garmentCategory,
      }),
    });

    if (!response.ok) {
      throw new Error('YouCam task creation failed.');
    }

    const payload: unknown = await response.json();
    return { taskId: validateVendorResponse(createTaskResponseSchema, payload) };
  },

  async getTryOnTask(taskId: string): Promise<{ status: 'pending' | 'running' } | { status: 'succeeded'; result: YouCamTaskResult } | { status: 'failed' }> {
    const response = await fetch(new URL(`/s2s/v2.0/task/cloth-v3/${encodeURIComponent(taskId)}`, options.baseUrl), {
      method: 'GET',
      headers: { authorization: `Bearer ${options.apiKey}` },
    });

    if (!response.ok) {
      return { status: 'failed' };
    }

    const payload: unknown = await response.json();
    const parsed = validateVendorResponse(taskStatusResponseSchema, payload);

    if (parsed.status === 'succeeded') {
      if (parsed.result === undefined) {
        return { status: 'failed' };
      }

      return {
        status: 'succeeded',
        result: {
          imageBuffer: Buffer.from(parsed.result.imageBase64, 'base64'),
          mimeType: parsed.result.mimeType,
        },
      };
    }

    return { status: parsed.status };
  },
});

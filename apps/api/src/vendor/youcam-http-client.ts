import { z } from 'zod';

import { validateVendorResponse } from '../middleware/validate.js';
import type { YouCamClient, YouCamTaskResult } from './youcam-client.js';

// Step 1a: POST /s2s/v2.0/file/cloth — init upload, get file_id + S3 presigned URL
const initUploadResponseSchema = z.object({
  data: z.object({
    files: z.array(z.object({
      file_id: z.string().min(1),
      requests: z.array(z.object({
        url: z.string().url(),
        method: z.string().optional(),
        headers: z.record(z.string()).optional(),
      })).min(1),
    })).min(1),
  }),
}).transform((v, context) => {
  const file = v.data.files[0];
  const uploadRequest = file?.requests[0];

  if (file === undefined || uploadRequest === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Missing upload file entry.' });
    return z.NEVER;
  }

  return { fileId: file.file_id, uploadRequest };
});

// Step 2: POST /s2s/v2.0/task/cloth — create task
const createTaskResponseSchema = z.object({
  data: z.object({ task_id: z.string().min(1) }),
}).transform((v) => v.data.task_id);

// Step 3: GET /s2s/v2.0/task/cloth/:id — poll.
// The API reports 'running' while in flight and returns the single result image as
// data.results.url on success.
const taskStatusResponseSchema = z.object({
  data: z.object({
    task_status: z.string().min(1),
    results: z.object({ url: z.string().url() }).nullish(),
    error: z.string().nullish(),
  }),
}).transform((v) => v.data);

// garment_category accepted values: upper_body | lower_body | full_body | shoes | auto.
// 'outerwear' is rejected by the API, so both of our categories map to upper_body.
const garmentCategoryMap: Record<'top' | 'outerwear', string> = {
  top: 'upper_body',
  outerwear: 'upper_body',
};

const toGarmentCategory = (category: 'top' | 'outerwear'): string => garmentCategoryMap[category];

/**
 * Upload a file using the 2-step Perfect Corp flow:
 * 1. POST /s2s/v2.0/file/cloth → get file_id + S3 presigned PUT URL
 * 2. PUT <s3-url>              → upload raw binary (no auth header)
 */
const uploadFile = async (
  buffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  apiKey: string,
  baseUrl: string,
  label: string,
): Promise<string> => {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const filename = `${label}.${ext}`;

  // --- Step 1a: init upload ---
  const initUrl = new URL('/s2s/v2.0/file/cloth', baseUrl).toString();
  const initBody = { files: [{ file_name: filename, file_size: buffer.length, content_type: mimeType }] };
  console.debug(`[YouCam] initUpload (${label}) →`, initUrl, initBody);

  const initResponse = await fetch(initUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(initBody),
  });

  const initText = await initResponse.text();
  console.debug(`[YouCam] initUpload (${label}) ←`, initResponse.status, initText.slice(0, 400));

  if (!initResponse.ok) {
    throw new Error(`YouCam file init (${label}) failed: HTTP ${initResponse.status} — ${initText.slice(0, 200)}`);
  }

  const { fileId, uploadRequest } = validateVendorResponse(initUploadResponseSchema, JSON.parse(initText) as unknown);

  // --- Step 1b: PUT binary to S3 presigned URL (no Authorization header) ---
  // The presigned URL signs the headers the API hands back, so send them verbatim.
  console.debug(`[YouCam] s3Upload (${label}) → PUT ${uploadRequest.url.slice(0, 80)}... bytes: ${buffer.length}`);

  const s3Response = await fetch(uploadRequest.url, {
    method: uploadRequest.method ?? 'PUT',
    headers: uploadRequest.headers ?? { 'content-type': mimeType },
    body: buffer,
  });

  console.debug(`[YouCam] s3Upload (${label}) ←`, s3Response.status);

  if (!s3Response.ok) {
    const s3Text = await s3Response.text();
    throw new Error(`YouCam S3 upload (${label}) failed: HTTP ${s3Response.status} — ${s3Text.slice(0, 200)}`);
  }

  return fileId;
};

export const createYouCamHttpClient = (options: { apiKey: string; baseUrl: string }): YouCamClient => ({
  async createTryOnTask(input): Promise<{ taskId: string }> {
    // Detect mime type from buffer magic bytes; default to jpeg
    const detectMime = (buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' => {
      if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
      if (buf[0] === 0x52 && buf[1] === 0x49) return 'image/webp';
      return 'image/jpeg';
    };

    const [personFileId, garmentFileId] = await Promise.all([
      uploadFile(input.basePhoto, detectMime(input.basePhoto), options.apiKey, options.baseUrl, 'person'),
      uploadFile(input.garmentImage, detectMime(input.garmentImage), options.apiKey, options.baseUrl, 'garment'),
    ]);

    const url = new URL('/s2s/v2.0/task/cloth', options.baseUrl).toString();
    const body = {
      src_file_id: personFileId,
      ref_file_id: garmentFileId,
      garment_category: toGarmentCategory(input.garmentCategory),
    };
    console.debug('[YouCam] createTryOnTask →', url, body);

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

    return { taskId: validateVendorResponse(createTaskResponseSchema, JSON.parse(rawText) as unknown) };
  },

  async getTryOnTask(taskId: string): Promise<{ status: 'pending' | 'running' } | { status: 'succeeded'; result: YouCamTaskResult } | { status: 'failed' }> {
    const url = new URL(`/s2s/v2.0/task/cloth/${encodeURIComponent(taskId)}`, options.baseUrl).toString();
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

    const parsed = validateVendorResponse(taskStatusResponseSchema, JSON.parse(rawText) as unknown);
    console.debug('[YouCam] task_status:', parsed.task_status);

    if (parsed.task_status === 'success') {
      const imageUrl = parsed.results?.url;
      if (imageUrl === undefined || imageUrl === null) {
        console.error('[YouCam] success but no result image URL');
        return { status: 'failed' };
      }

      console.debug('[YouCam] downloading result image from', imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error('[YouCam] result image download failed:', imageResponse.status);
        return { status: 'failed' };
      }

      const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg';
      const mimeType = (['image/jpeg', 'image/png', 'image/webp'] as const).find((m) => contentType.includes(m)) ?? 'image/jpeg';
      const arrayBuffer = await imageResponse.arrayBuffer();
      return { status: 'succeeded', result: { imageBuffer: Buffer.from(arrayBuffer), mimeType } };
    }

    if (['error', 'failed', 'failure'].includes(parsed.task_status)) {
      console.error('[YouCam] task failed:', parsed.error ?? 'no error detail');
      return { status: 'failed' };
    }

    // 'running' | 'in_progress' | 'pending' → map to our internal pending/running
    return { status: parsed.task_status === 'pending' ? 'pending' : 'running' };
  },
});

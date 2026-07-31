import type { RequestHandler, Response } from 'express';
import { z } from 'zod';

import { createFailure } from '../contracts/api.js';
import type { ResultDownloadService } from '../services/result-download-service.js';

const resultIdSchema = z.string().uuid();

const sendImage = (response: Response, image: { buffer: Buffer; mimeType: string }, filename: string): void => {
  response.setHeader('content-type', image.mimeType);
  response.setHeader('content-disposition', `attachment; filename="${filename}"`);
  response.setHeader('content-length', String(image.buffer.length));
  // The watermark is burned in per request; never let a proxy keep a copy.
  response.setHeader('cache-control', 'private, no-store');
  response.status(200).end(image.buffer);
};

export const createCurrentResultDownloadController = (downloadService: ResultDownloadService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const userId = request.auth?.userId;
      const parsed = resultIdSchema.safeParse(request.params.resultId);

      if (userId === undefined || !parsed.success) {
        response.status(400).json(createFailure('INVALID_REQUEST', 'The request data is invalid.'));
        return;
      }

      const image = await downloadService.downloadCurrentResult(userId, parsed.data);
      sendImage(response, image, 'truefit-try-on.jpg');
    } catch (error: unknown) {
      next(error);
    }
  };

export const createSavedResultDownloadController = (downloadService: ResultDownloadService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const userId = request.auth?.userId;
      const parsed = resultIdSchema.safeParse(request.params.savedTryOnId);

      if (userId === undefined || !parsed.success) {
        response.status(400).json(createFailure('INVALID_REQUEST', 'The request data is invalid.'));
        return;
      }

      const image = await downloadService.downloadSavedResult(userId, parsed.data);
      sendImage(response, image, 'truefit-look.jpg');
    } catch (error: unknown) {
      next(error);
    }
  };

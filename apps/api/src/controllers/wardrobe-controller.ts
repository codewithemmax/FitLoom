import type { RequestHandler } from 'express';

import { createFailure, createSuccess } from '../contracts/api.js';
import { saveTryOnRequestSchema, type WardrobeSaveService } from '../services/wardrobe-save-service.js';

export const createWardrobeSaveController = (saveService: WardrobeSaveService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const userId = request.auth?.userId;
      const parsed = saveTryOnRequestSchema.safeParse(request.body);

      if (userId === undefined || !parsed.success) {
        response.status(400).json(createFailure('INVALID_REQUEST', 'The request data is invalid.'));
        return;
      }

      const saved = await saveService.saveCurrentResult(userId, parsed.data.resultId);
      response.status(201).json(createSuccess(saved));
    } catch (error: unknown) {
      next(error);
    }
  };

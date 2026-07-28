import type { RequestHandler } from 'express';

import { createFailure, createSuccess, tryOnMetadataSchema } from '../contracts/api.js';
import type { TryOnOrchestrationService } from '../services/try-on-orchestration-service.js';

export const createGenerateTryOnPlaceholder: RequestHandler = (_request, response): void => {
  response.status(202).json(
    createSuccess({
      status: 'accepted',
      message: 'Try-on generation orchestration will be implemented in the next unit.',
    }),
  );
};

export const createTryOnController = (tryOnService: TryOnOrchestrationService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const metadata = tryOnMetadataSchema.safeParse(request.uploadedFields ?? {});
      const basePhoto = request.uploadedFiles?.basePhoto;
      const garmentImage = request.uploadedFiles?.garmentImage;

      if (!metadata.success || basePhoto === undefined || garmentImage === undefined) {
        response.status(400).json(createFailure('INVALID_REQUEST', 'The request data is invalid.'));
        return;
      }

      const requestMetadata = {
        title: metadata.data.garmentTitle,
        sourceUrl: metadata.data.garmentSourceUrl,
        ...(metadata.data.composition === undefined ? {} : { composition: metadata.data.composition }),
        ...(metadata.data.sizeChartHints === undefined ? {} : { sizeChartHints: metadata.data.sizeChartHints }),
      };

      const result = await tryOnService.generateTryOn({
        basePhoto: basePhoto.buffer,
        garmentImage: garmentImage.buffer,
        garmentCategory: metadata.data.garmentCategory,
        metadata: requestMetadata,
      });

      response.status(200).json(createSuccess(result));
    } catch (error: unknown) {
      next(error);
    }
  };

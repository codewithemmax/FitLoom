import { AppError } from '../errors/app-error.js';
import type { SafeSearchService } from './safe-search-service.js';
import type { YouCamClient, YouCamTaskResult } from '../vendor/youcam-client.js';

export type TryOnInput = {
  basePhoto: Buffer;
  garmentImage: Buffer;
  garmentCategory: 'top' | 'outerwear';
  metadata: {
    title: string;
    sourceUrl: string;
    composition?: string;
    sizeChartHints?: string;
  };
};

export type TryOnResult = {
  imageBase64: string;
  mimeType: YouCamTaskResult['mimeType'];
};

export type TryOnServiceOptions = {
  pollIntervalMs: number;
  timeoutMs: number;
};

export type TryOnOrchestrationService = {
  generateTryOn(input: TryOnInput): Promise<TryOnResult>;
};

const wait = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
};

export const createTryOnOrchestrationService = (
  safeSearchService: SafeSearchService,
  youCamClient: YouCamClient,
  options: TryOnServiceOptions,
): TryOnOrchestrationService => ({
  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    let generatedImage: Buffer | undefined;

    try {
      const baseOutcome = await safeSearchService.moderateImage(input.basePhoto);
      const garmentOutcome = await safeSearchService.moderateImage(input.garmentImage);

      if (baseOutcome !== 'safe' || garmentOutcome !== 'safe') {
        throw new AppError(422, 'SAFETY_BLOCKED', 'The request could not be approved for try-on generation.');
      }

      const task = await youCamClient.createTryOnTask({
        basePhoto: input.basePhoto,
        garmentImage: input.garmentImage,
        garmentCategory: input.garmentCategory,
      });
      const deadline = Date.now() + options.timeoutMs;

      while (Date.now() < deadline) {
        const taskState = await youCamClient.getTryOnTask(task.taskId);

        if (taskState.status === 'failed') {
          throw new AppError(502, 'TRY_ON_FAILED', 'Try-on generation failed. Please try again later.');
        }

        if (taskState.status === 'succeeded') {
          generatedImage = taskState.result.imageBuffer;
          const generatedOutcome = await safeSearchService.moderateImage(generatedImage);

          if (generatedOutcome !== 'safe') {
            throw new AppError(422, 'SAFETY_BLOCKED', 'The generated result could not be approved for return.');
          }

          return {
            imageBase64: generatedImage.toString('base64'),
            mimeType: taskState.result.mimeType,
          };
        }

        await wait(options.pollIntervalMs);
      }

      throw new AppError(504, 'TRY_ON_TIMEOUT', 'Try-on generation timed out. Please try again later.');
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(502, 'TRY_ON_FAILED', 'Try-on generation failed. Please try again later.');
    } finally {
      input.basePhoto = Buffer.alloc(0);
      input.garmentImage = Buffer.alloc(0);
      generatedImage = undefined;
    }
  },
});

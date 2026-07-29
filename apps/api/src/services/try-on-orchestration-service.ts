import { AppError } from '../errors/app-error.js';
import type { CurrentResultStore } from './current-result-store.js';
import type { FitNoteService, FitPhysicsNote } from './fit-note-service.js';
import { createPermissivePersonPhotoValidationService, type PersonPhotoValidationService } from './person-photo-validation-service.js';
import type { SafeSearchService } from './safe-search-service.js';
import type { YouCamClient, YouCamTaskResult } from '../vendor/youcam-client.js';

export type TryOnInput = {
  userId: string;
  basePhoto: Buffer;
  garmentImage?: Buffer;
  garmentImages?: Buffer[];
  garmentCategory: 'top' | 'outerwear';
  metadata: {
    title: string;
    sourceUrl: string;
    cut?: string;
    composition?: string;
    sizeChartHints?: string;
  };
  profile?: {
    height?: string;
    usualSize?: string;
    fitPreferences?: string;
  };
};

export type TryOnResult = {
  resultId: string;
  imageBase64: string;
  mimeType: YouCamTaskResult['mimeType'];
  fitPhysicsNote: FitPhysicsNote;
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
  fitNoteService: FitNoteService,
  currentResultStore: CurrentResultStore,
  options: TryOnServiceOptions,
  personPhotoValidationService: PersonPhotoValidationService = createPermissivePersonPhotoValidationService(),
): TryOnOrchestrationService => ({
  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    let generatedImage: Buffer | undefined;
    const garmentImages = [...(input.garmentImages ?? []), ...(input.garmentImage === undefined ? [] : [input.garmentImage])];

    try {
      if (garmentImages.length === 0) {
        throw new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.');
      }

      const personPhotoValidation = await personPhotoValidationService.validatePersonPhoto(input.basePhoto);
      if (personPhotoValidation.status !== 'approved') {
        throw new AppError(422, 'PERSON_PHOTO_INVALID', "The person photo must clearly show the user's face and body for a safe try-on.");
      }

      const baseOutcome = await safeSearchService.moderateImage(input.basePhoto);
      const garmentOutcomes = await Promise.all(garmentImages.map((image) => safeSearchService.moderateImage(image)));

      if (baseOutcome !== 'safe' || garmentOutcomes.some((outcome) => outcome !== 'safe')) {
        throw new AppError(422, 'SAFETY_BLOCKED', 'The request could not be approved for try-on generation.');
      }

      const task = await youCamClient.createTryOnTask({
        basePhoto: input.basePhoto,
        garmentImage: garmentImages[0] as Buffer,
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

          const fitPhysicsNote = await fitNoteService.createFitNote({
            garment: { category: input.garmentCategory, ...input.metadata },
            ...(input.profile === undefined ? {} : { profile: input.profile }),
          });
          const imageBase64 = generatedImage.toString('base64');
          const storedResult = currentResultStore.put({
            userId: input.userId,
            imageBase64,
            mimeType: taskState.result.mimeType,
            fitPhysicsNote,
            garment: { category: input.garmentCategory, ...input.metadata },
          });

          return {
            resultId: storedResult.id,
            imageBase64,
            mimeType: taskState.result.mimeType,
            fitPhysicsNote,
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
      if (input.garmentImage !== undefined) {
        input.garmentImage = Buffer.alloc(0);
      }
      if (input.garmentImages !== undefined) {
        input.garmentImages = input.garmentImages.map(() => Buffer.alloc(0));
      }
      generatedImage = undefined;
    }
  },
});

import type { PersonPhotoValidationResult, PersonPhotoValidationService } from './person-photo-validation-service.js';
import { decodeImageToTensor } from './image-tensor.js';
import { getNsfwModel, type NsfwPrediction } from './nsfwjs-safe-search-service.js';

const EXPLICIT_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']);

export const createNsfwjsPersonPhotoValidationService = (): PersonPhotoValidationService => ({
  async validatePersonPhoto(image: Buffer): Promise<PersonPhotoValidationResult> {
    const model = getNsfwModel();
    if (model === undefined) {
      console.error('[NSFWJS:PersonValidation] model not loaded — call initNsfwModel() at startup');
      return { status: 'rejected', reason: 'unclear_face' };
    }

    const tensor = await decodeImageToTensor(image);
    try {
      const predictions: NsfwPrediction[] = await model.classify(tensor);
      console.debug('[NSFWJS:PersonValidation] predictions:', predictions.map((p) => `${p.className}=${p.probability.toFixed(3)}`).join(' '));

      const explicit = predictions.find((p) => EXPLICIT_CLASSES.has(p.className) && p.probability > 0.5);
      if (explicit !== undefined) {
        console.debug('[NSFWJS:PersonValidation] rejected — explicit:', explicit.className, explicit.probability.toFixed(3));
        return { status: 'rejected', reason: 'not_person_photo' };
      }

      // Deliberately no "dominant class must be Neutral" rule. nsfwjs classifies
      // explicitness and illustration style, never whether a person is present:
      // a rendered-looking photo scores Drawing and a photo of an empty room
      // scores Neutral. Person detection belongs to the Vision face check.
      console.debug('[NSFWJS:PersonValidation] approved (explicitness only)');
      return { status: 'approved' };
    } finally {
      tensor.dispose();
    }
  },
});

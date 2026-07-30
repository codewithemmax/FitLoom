import type { PersonPhotoValidationResult, PersonPhotoValidationService } from './person-photo-validation-service.js';
// getNsfwModel() returns the singleton loaded by initNsfwModel() at startup.
import { getNsfwModel } from './nsfwjs-safe-search-service.js';

const EXPLICIT_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']);

export const createNsfwjsPersonPhotoValidationService = (): PersonPhotoValidationService => ({
  async validatePersonPhoto(image: Buffer): Promise<PersonPhotoValidationResult> {
    const model = getNsfwModel();
    if (model === undefined) {
      console.error('[NSFWJS:PersonValidation] model not loaded — call initNsfwModel() at startup');
      return { status: 'rejected', reason: 'unclear_face' };
    }

    const tf = await import('@tensorflow/tfjs-node');
    const tensor = tf.node.decodeImage(image, 3) as Parameters<typeof model.classify>[0];

    try {
      const predictions = await model.classify(tensor);
      console.debug('[NSFWJS:PersonValidation] predictions:', predictions.map((p) => `${p.className}=${p.probability.toFixed(3)}`).join(' '));

      const explicit = predictions.find((p) => EXPLICIT_CLASSES.has(p.className) && p.probability > 0.5);
      if (explicit !== undefined) {
        console.debug('[NSFWJS:PersonValidation] rejected — explicit:', explicit.className, explicit.probability.toFixed(3));
        return { status: 'rejected', reason: 'not_person_photo' };
      }

      const sorted = [...predictions].sort((a, b) => b.probability - a.probability);
      if (sorted[0]?.className !== 'Neutral') {
        console.debug('[NSFWJS:PersonValidation] rejected — dominant class not Neutral:', sorted[0]?.className);
        return { status: 'rejected', reason: 'not_person_photo' };
      }

      console.debug('[NSFWJS:PersonValidation] approved');
      return { status: 'approved' };
    } finally {
      tensor.dispose();
    }
  },
});

import * as tf from '@tensorflow/tfjs';
import jpegJs from 'jpeg-js';
import type { PersonPhotoValidationResult, PersonPhotoValidationService } from './person-photo-validation-service.js';
import { getNsfwModel, type NsfwPrediction } from './nsfwjs-safe-search-service.js';

const EXPLICIT_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']);

const bufferToTensor = (image: Buffer): tf.Tensor3D => {
  const decoded = jpegJs.decode(image, { useTArray: true });
  const numPixels = decoded.width * decoded.height;
  const values = new Int32Array(numPixels * 3);
  for (let i = 0; i < numPixels; i++) {
    values[i * 3]     = decoded.data[i * 4]!;
    values[i * 3 + 1] = decoded.data[i * 4 + 1]!;
    values[i * 3 + 2] = decoded.data[i * 4 + 2]!;
  }
  return tf.tensor3d(values, [decoded.height, decoded.width, 3], 'int32');
};

export const createNsfwjsPersonPhotoValidationService = (): PersonPhotoValidationService => ({
  async validatePersonPhoto(image: Buffer): Promise<PersonPhotoValidationResult> {
    const model = getNsfwModel();
    if (model === undefined) {
      console.error('[NSFWJS:PersonValidation] model not loaded — call initNsfwModel() at startup');
      return { status: 'rejected', reason: 'unclear_face' };
    }

    const tensor = bufferToTensor(image);
    try {
      const predictions: NsfwPrediction[] = await model.classify(tensor);
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

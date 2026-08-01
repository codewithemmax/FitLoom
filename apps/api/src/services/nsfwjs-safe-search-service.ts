import * as tf from '@tensorflow/tfjs';
import jpegJs from 'jpeg-js';
import type { SafeSearchOutcome, SafeSearchService } from './safe-search-service.js';

type NsfwModel = Awaited<ReturnType<typeof import('nsfwjs')['load']>>;

// nsfwjs ships ESM declarations with extensionless relative imports, which do not resolve
// under NodeNext, so its exported types degrade to `any`. Declare the shape we rely on.
export type NsfwPrediction = { className: string; probability: number };

let nsfwModel: NsfwModel | undefined;

export const getNsfwModel = (): NsfwModel | undefined => nsfwModel;

export const initNsfwModel = async (): Promise<void> => {
  if (nsfwModel !== undefined) return;
  const nsfwjs = await import('nsfwjs');
  nsfwModel = await nsfwjs.load();
  console.info('[NSFWJS] model loaded');
};

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

const UNSAFE_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']);

export const createNsfwjsSafeSearchService = (): SafeSearchService => ({
  async moderateImage(image: Buffer): Promise<SafeSearchOutcome> {
    const model = getNsfwModel();
    if (model === undefined) {
      console.error('[NSFWJS] model not loaded — call initNsfwModel() at startup');
      return 'indeterminate';
    }

    const tensor = bufferToTensor(image);
    try {
      const predictions: NsfwPrediction[] = await model.classify(tensor);
      console.debug('[NSFWJS] predictions:', predictions.map((p) => `${p.className}=${p.probability.toFixed(3)}`).join(' '));

      const blocked = predictions.find((p) => UNSAFE_CLASSES.has(p.className) && p.probability > 0.5);
      if (blocked !== undefined) {
        console.debug('[NSFWJS] blocked by', blocked.className, blocked.probability.toFixed(3));
        return 'unsafe';
      }
      return 'safe';
    } finally {
      tensor.dispose();
    }
  },
});

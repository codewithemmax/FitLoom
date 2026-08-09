import type { SafeSearchOutcome, SafeSearchService } from './safe-search-service.js';
import { decodeImageToTensor } from './image-tensor.js';

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

const UNSAFE_CLASSES = new Set(['Porn', 'Hentai', 'Sexy']);

export const createNsfwjsSafeSearchService = (): SafeSearchService => ({
  async moderateImage(image: Buffer): Promise<SafeSearchOutcome> {
    const model = getNsfwModel();
    if (model === undefined) {
      console.error('[NSFWJS] model not loaded — call initNsfwModel() at startup');
      return 'indeterminate';
    }

    const tensor = await decodeImageToTensor(image);
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

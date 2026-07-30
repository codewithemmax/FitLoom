import type { SafeSearchOutcome, SafeSearchService } from './safe-search-service.js';

type NsfwModel = Awaited<ReturnType<typeof import('nsfwjs')['load']>>;

let nsfwModel: NsfwModel | undefined;

export const getNsfwModel = (): NsfwModel | undefined => nsfwModel;

export const initNsfwModel = async (): Promise<void> => {
  if (nsfwModel !== undefined) return;
  await import('@tensorflow/tfjs-node');
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

    const tf = await import('@tensorflow/tfjs-node');
    const tensor = tf.node.decodeImage(image, 3) as Parameters<typeof model.classify>[0];

    try {
      const predictions = await model.classify(tensor);
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

import * as tf from '@tensorflow/tfjs';
import sharp, { type OutputInfo } from 'sharp';

import { AppError } from '../errors/app-error.js';

/**
 * nsfwjs resizes every input to a 224px square before inference, so decoding at
 * full resolution only costs memory: a 4000x6000 photo would expand to a 288 MB
 * Int32Array. Capping the long edge leaves the classifier's effective view
 * unchanged while keeping peak memory bounded on small instances.
 */
const MAX_EDGE_PX = 640;

/**
 * Decodes any format the upload middleware accepts — JPEG, PNG, or WebP — into
 * the RGB tensor nsfwjs expects. The previous jpeg-js path only handled JPEG and
 * failed with an opaque "SOI not found" on everything else.
 */
export const decodeImageToTensor = async (image: Buffer): Promise<tf.Tensor3D> => {
  let data: Buffer;
  let info: OutputInfo;

  try {
    // rotate() with no argument applies EXIF orientation, so portrait photos
    // straight off a phone are classified the right way up.
    ({ data, info } = await sharp(image)
      .rotate()
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }));
  } catch {
    throw new AppError(400, 'INVALID_REQUEST', 'The image could not be read. Use a JPG, PNG, or WebP photo.');
  }

  if (info.channels !== 3) {
    throw new AppError(400, 'INVALID_REQUEST', 'The image could not be read. Use a JPG, PNG, or WebP photo.');
  }

  const values = new Int32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    values[i] = data[i]!;
  }

  return tf.tensor3d(values, [info.height, info.width, 3], 'int32');
};

import { z } from 'zod';

import { validateVendorResponse } from '../middleware/validate.js';
import { classifySafeSearchAnnotation, type SafeSearchLikelihood, type SafeSearchOutcome, type SafeSearchService } from './safe-search-service.js';

const likelihoodSchema = z.enum(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'] satisfies [SafeSearchLikelihood, ...SafeSearchLikelihood[]]);

const visionResponseSchema = z.object({
  responses: z
    .array(
      z.object({
        safeSearchAnnotation: z
          .object({
            adult: likelihoodSchema,
            spoof: likelihoodSchema,
            medical: likelihoodSchema,
            violence: likelihoodSchema,
            racy: likelihoodSchema,
          })
          .optional(),
        error: z.unknown().optional(),
      }),
    )
    .min(1),
});

export const createGoogleVisionSafeSearchService = (apiKey: string): SafeSearchService => ({
  async moderateImage(image: Buffer): Promise<SafeSearchOutcome> {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: image.toString('base64') },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
          },
        ],
      }),
    });

    if (!response.ok) {
      return 'indeterminate';
    }

    const payload: unknown = await response.json();
    const parsed = validateVendorResponse(visionResponseSchema, payload);
    const firstResponse = parsed.responses[0];

    if (firstResponse === undefined || firstResponse.error !== undefined) {
      return 'indeterminate';
    }

    return classifySafeSearchAnnotation(firstResponse.safeSearchAnnotation);
  },
});

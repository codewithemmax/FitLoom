import { z } from 'zod';

import { validateVendorResponse } from '../middleware/validate.js';
import type { PersonPhotoValidationResult, PersonPhotoValidationService } from './person-photo-validation-service.js';

const faceDetectionResponseSchema = z.object({
  responses: z
    .array(
      z.object({
        faceAnnotations: z
          .array(
            z.object({
              detectionConfidence: z.number().optional(),
              blurredLikelihood: z.string().optional(),
              underExposedLikelihood: z.string().optional(),
            }),
          )
          .optional(),
        error: z.unknown().optional(),
      }),
    )
    .min(1),
});

const unclearLikelihoods = new Set(['LIKELY', 'VERY_LIKELY']);

export const createGooglePersonPhotoValidationService = (apiKey: string): PersonPhotoValidationService => ({
  async validatePersonPhoto(image: Buffer): Promise<PersonPhotoValidationResult> {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: image.toString('base64') },
            features: [{ type: 'FACE_DETECTION', maxResults: 4 }],
          },
        ],
      }),
    });

    if (!response.ok) {
      return { status: 'rejected', reason: 'unclear_face' };
    }

    const payload: unknown = await response.json();
    const parsed = validateVendorResponse(faceDetectionResponseSchema, payload);
    const firstResponse = parsed.responses[0];

    if (firstResponse === undefined || firstResponse.error !== undefined) {
      return { status: 'rejected', reason: 'unclear_face' };
    }

    const faces = firstResponse.faceAnnotations ?? [];
    if (faces.length === 0) {
      return { status: 'rejected', reason: 'no_face_detected' };
    }

    const primaryFace = faces[0];
    if (
      (primaryFace?.detectionConfidence ?? 0) < 0.55 ||
      unclearLikelihoods.has(primaryFace?.blurredLikelihood ?? '') ||
      unclearLikelihoods.has(primaryFace?.underExposedLikelihood ?? '')
    ) {
      return { status: 'rejected', reason: 'unclear_face' };
    }

    return { status: 'approved' };
  },
});

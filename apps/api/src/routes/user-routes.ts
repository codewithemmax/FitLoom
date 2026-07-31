import { Router } from 'express';

import { createSuccess, generateTryOnRequestSchema } from '../contracts/api.js';
import { getCurrentUser } from '../controllers/current-user-controller.js';
import { createCurrentResultDownloadController, createSavedResultDownloadController } from '../controllers/download-controller.js';
import { createWardrobeSaveController } from '../controllers/wardrobe-controller.js';
import { createGenerateTryOnPlaceholder, createTryOnController } from '../controllers/try-on-controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { createMemoryUploadMiddleware } from '../middleware/memory-upload.js';
import { validateBody } from '../middleware/validate.js';
import type { ResultDownloadService } from '../services/result-download-service.js';
import type { TryOnOrchestrationService } from '../services/try-on-orchestration-service.js';
import type { WardrobeSaveService } from '../services/wardrobe-save-service.js';
import type { SupabaseAuthService } from '../services/supabase-auth-service.js';

export const createUserRouter = (
  authService: SupabaseAuthService,
  tryOnService: TryOnOrchestrationService,
  wardrobeSaveService?: WardrobeSaveService,
  downloadService?: ResultDownloadService,
): Router => {
  const userRouter = Router();
  const authenticate = createAuthenticateMiddleware(authService);

  userRouter.get('/me', authenticate, getCurrentUser);
  userRouter.get('/authenticated', authenticate, (request, response): void => {
    response.status(200).json(createSuccess({ userId: request.auth?.userId }));
  });
  userRouter.post('/generate-try-on', authenticate, validateBody(generateTryOnRequestSchema), createGenerateTryOnPlaceholder);
  if (wardrobeSaveService !== undefined) {
    userRouter.post('/wardrobe', authenticate, createWardrobeSaveController(wardrobeSaveService));
  }
  if (downloadService !== undefined) {
    // Downloads are watermarked on the way out; the stored original is untouched.
    userRouter.get('/try-ons/:resultId/download', authenticate, createCurrentResultDownloadController(downloadService));
    userRouter.get('/wardrobe/:savedTryOnId/download', authenticate, createSavedResultDownloadController(downloadService));
  }

  userRouter.post(
    '/try-ons',
    authenticate,
    // YouCam returns a result at the same resolution as the person photo, so the
    // per-file cap tracks the vendor's own 10 MB input limit rather than sitting
    // below it and rejecting the high-resolution photos that produce sharp results.
    createMemoryUploadMiddleware({ fileSizeLimitBytes: 10 * 1024 * 1024, totalSizeLimitBytes: 30 * 1024 * 1024 }),
    createTryOnController(tryOnService),
  );

  return userRouter;
};

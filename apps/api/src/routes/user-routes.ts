import { Router } from 'express';

import { createSuccess, generateTryOnRequestSchema } from '../contracts/api.js';
import { getCurrentUser } from '../controllers/current-user-controller.js';
import { createWardrobeSaveController } from '../controllers/wardrobe-controller.js';
import { createGenerateTryOnPlaceholder, createTryOnController } from '../controllers/try-on-controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { createMemoryUploadMiddleware } from '../middleware/memory-upload.js';
import { validateBody } from '../middleware/validate.js';
import type { TryOnOrchestrationService } from '../services/try-on-orchestration-service.js';
import type { WardrobeSaveService } from '../services/wardrobe-save-service.js';
import type { SupabaseAuthService } from '../services/supabase-auth-service.js';

export const createUserRouter = (authService: SupabaseAuthService, tryOnService: TryOnOrchestrationService, wardrobeSaveService?: WardrobeSaveService): Router => {
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

  userRouter.post(
    '/try-ons',
    authenticate,
    createMemoryUploadMiddleware({ fileSizeLimitBytes: 5 * 1024 * 1024, totalSizeLimitBytes: 12 * 1024 * 1024 }),
    createTryOnController(tryOnService),
  );

  return userRouter;
};

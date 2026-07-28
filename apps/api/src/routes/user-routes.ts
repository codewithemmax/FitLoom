import { Router } from 'express';

import { createSuccess, generateTryOnRequestSchema } from '../contracts/api.js';
import { getCurrentUser } from '../controllers/current-user-controller.js';
import { createGenerateTryOnPlaceholder } from '../controllers/try-on-controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import type { SupabaseAuthService } from '../services/supabase-auth-service.js';

export const createUserRouter = (authService: SupabaseAuthService): Router => {
  const userRouter = Router();
  const authenticate = createAuthenticateMiddleware(authService);

  userRouter.get('/me', authenticate, getCurrentUser);
  userRouter.get('/authenticated', authenticate, (request, response): void => {
    response.status(200).json(createSuccess({ userId: request.auth?.userId }));
  });
  userRouter.post('/generate-try-on', authenticate, validateBody(generateTryOnRequestSchema), createGenerateTryOnPlaceholder);

  return userRouter;
};

import { Router } from 'express';

import { getCurrentUser } from '../controllers/current-user-controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.js';
import type { SupabaseAuthService } from '../services/supabase-auth-service.js';

export const createUserRouter = (authService: SupabaseAuthService): Router => {
  const userRouter = Router();

  userRouter.get('/me', createAuthenticateMiddleware(authService), getCurrentUser);

  return userRouter;
};

import express, { type Express } from 'express';

import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './routes/health-routes.js';
import { createUserRouter } from './routes/user-routes.js';
import type { SupabaseAuthService } from './services/supabase-auth-service.js';

export type AppDependencies = {
  authService: SupabaseAuthService;
};

export const createApp = ({ authService }: AppDependencies): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRouter);
  app.use('/api/v1', createUserRouter(authService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

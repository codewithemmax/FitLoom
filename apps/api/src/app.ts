import express, { type Express } from 'express';

import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './routes/health-routes.js';
import { createUserRouter } from './routes/user-routes.js';
import { createInMemoryCurrentResultStore } from './services/current-result-store.js';
import { createUnavailableFitNoteService } from './services/fit-note-service.js';
import { createUnavailableSafeSearchService } from './services/safe-search-service.js';
import type { WardrobeSaveService } from './services/wardrobe-save-service.js';
import { createTryOnOrchestrationService, type TryOnOrchestrationService } from './services/try-on-orchestration-service.js';
import type { SupabaseAuthService } from './services/supabase-auth-service.js';
import { createUnavailableYouCamClient } from './vendor/youcam-client.js';

export type AppDependencies = {
  authService: SupabaseAuthService;
  tryOnService?: TryOnOrchestrationService;
  wardrobeSaveService?: WardrobeSaveService;
};

const currentResultStore = createInMemoryCurrentResultStore();

export const createApp = ({ authService, tryOnService, wardrobeSaveService }: AppDependencies): Express => {
  const app = express();
  const resolvedTryOnService =
    tryOnService ??
    createTryOnOrchestrationService(
      createUnavailableSafeSearchService(),
      createUnavailableYouCamClient(),
      createUnavailableFitNoteService(),
      currentResultStore,
      {
        pollIntervalMs: 1_000,
        timeoutMs: 30_000,
      },
    );

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRouter);
  app.use('/api/v1', createUserRouter(authService, resolvedTryOnService, wardrobeSaveService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

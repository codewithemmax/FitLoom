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

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
  );

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin !== undefined && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRouter);
  app.use('/api/v1', createUserRouter(authService, resolvedTryOnService, wardrobeSaveService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

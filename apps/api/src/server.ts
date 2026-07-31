import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createInMemoryCurrentResultStore } from './services/current-result-store.js';
import { createUnavailableFitNoteService } from './services/fit-note-service.js';
import { createGroqFitNoteService } from './services/groq-fit-note-service.js';
import { createNsfwjsSafeSearchService, initNsfwModel } from './services/nsfwjs-safe-search-service.js';
import { createNsfwjsPersonPhotoValidationService } from './services/nsfwjs-person-photo-validation-service.js';
import { createSupabaseAuthService } from './services/supabase-auth-service.js';
import { createTryOnOrchestrationService } from './services/try-on-orchestration-service.js';
import { createSupabaseWardrobePersistence, createWardrobeSaveService } from './services/wardrobe-save-service.js';
import { createUnavailableYouCamClient } from './vendor/youcam-client.js';
import { createYouCamHttpClient } from './vendor/youcam-http-client.js';

const config = loadConfig();
const authService = createSupabaseAuthService(config);
const currentResultStore = createInMemoryCurrentResultStore();

await initNsfwModel();

const safeSearchService = createNsfwjsSafeSearchService();
const personPhotoValidationService = createNsfwjsPersonPhotoValidationService();
const youCamClient =
  config.YOUCAM_API_KEY === undefined
    ? createUnavailableYouCamClient()
    : createYouCamHttpClient({ apiKey: config.YOUCAM_API_KEY, baseUrl: config.YOUCAM_BASE_URL });
const fitNoteService =
  config.GROQ_API_KEY === undefined
    ? createUnavailableFitNoteService()
    : createGroqFitNoteService({ apiKey: config.GROQ_API_KEY, model: config.GROQ_MODEL, baseUrl: config.GROQ_BASE_URL });
const tryOnService = createTryOnOrchestrationService(
  safeSearchService,
  youCamClient,
  fitNoteService,
  currentResultStore,
  {
    pollIntervalMs: config.TRY_ON_POLL_INTERVAL_MS,
    timeoutMs: config.TRY_ON_TIMEOUT_MS,
  },
  personPhotoValidationService,
);
const wardrobeSaveService = createWardrobeSaveService(currentResultStore, createSupabaseWardrobePersistence(config));
const app = createApp({ authService, tryOnService, wardrobeSaveService });

app.listen(config.PORT, (): void => {
  console.info(`TrueFit API listening on port ${config.PORT}`);
});

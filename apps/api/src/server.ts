import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createInMemoryCurrentResultStore } from './services/current-result-store.js';
import { createUnavailableFitNoteService } from './services/fit-note-service.js';
import { createGroqFitNoteService } from './services/groq-fit-note-service.js';
import { createNsfwjsSafeSearchService, initNsfwModel } from './services/nsfwjs-safe-search-service.js';
import { createNsfwjsPersonPhotoValidationService } from './services/nsfwjs-person-photo-validation-service.js';
import { createGooglePersonPhotoValidationService } from './services/google-person-photo-validation-service.js';
import { createResultDownloadService, createSupabaseSavedResultLoader } from './services/result-download-service.js';
import { createSupabaseAuthService } from './services/supabase-auth-service.js';
import { createTryOnOrchestrationService } from './services/try-on-orchestration-service.js';
import { createWatermarkService } from './services/watermark-service.js';
import { createSupabaseWardrobePersistence, createWardrobeSaveService } from './services/wardrobe-save-service.js';
import { createUnavailableYouCamClient } from './vendor/youcam-client.js';
import { createYouCamHttpClient } from './vendor/youcam-http-client.js';

const config = loadConfig();
const authService = createSupabaseAuthService(config);
const currentResultStore = createInMemoryCurrentResultStore();

await initNsfwModel();

const safeSearchService = createNsfwjsSafeSearchService();
// Vision detects an actual face, but every Vision method requires a billing
// account on the GCP project even inside the free tier, so it stays opt-in via
// VISION_FACE_VALIDATION=on. Without it, nsfwjs covers explicitness only — it
// does not verify that a person is present.
const personPhotoValidationService =
  config.GOOGLE_CLOUD_VISION_API_KEY !== undefined && process.env.VISION_FACE_VALIDATION === 'on'
    ? createGooglePersonPhotoValidationService(config.GOOGLE_CLOUD_VISION_API_KEY)
    : createNsfwjsPersonPhotoValidationService();
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
const downloadService = createResultDownloadService(
  currentResultStore,
  createSupabaseSavedResultLoader(config),
  createWatermarkService(),
);
const app = createApp({ authService, tryOnService, wardrobeSaveService, downloadService });

app.listen(config.PORT, (): void => {
  console.info(`FitLoom API listening on port ${config.PORT}`);
});

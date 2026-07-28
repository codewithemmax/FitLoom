import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createGoogleVisionSafeSearchService } from './services/google-vision-safe-search-service.js';
import { createUnavailableSafeSearchService } from './services/safe-search-service.js';
import { createSupabaseAuthService } from './services/supabase-auth-service.js';
import { createTryOnOrchestrationService } from './services/try-on-orchestration-service.js';
import { createUnavailableYouCamClient } from './vendor/youcam-client.js';
import { createYouCamHttpClient } from './vendor/youcam-http-client.js';

const config = loadConfig();
const authService = createSupabaseAuthService(config);
const safeSearchService =
  config.GOOGLE_CLOUD_VISION_API_KEY === undefined
    ? createUnavailableSafeSearchService()
    : createGoogleVisionSafeSearchService(config.GOOGLE_CLOUD_VISION_API_KEY);
const youCamClient =
  config.YOUCAM_API_KEY === undefined
    ? createUnavailableYouCamClient()
    : createYouCamHttpClient({ apiKey: config.YOUCAM_API_KEY, baseUrl: config.YOUCAM_BASE_URL });
const tryOnService = createTryOnOrchestrationService(safeSearchService, youCamClient, {
  pollIntervalMs: config.TRY_ON_POLL_INTERVAL_MS,
  timeoutMs: config.TRY_ON_TIMEOUT_MS,
});
const app = createApp({ authService, tryOnService });

app.listen(config.PORT, (): void => {
  console.info(`TrueFit API listening on port ${config.PORT}`);
});

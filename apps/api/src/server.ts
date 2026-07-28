import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createSupabaseAuthService } from './services/supabase-auth-service.js';

const config = loadConfig();
const authService = createSupabaseAuthService(config);
const app = createApp({ authService });

app.listen(config.PORT, (): void => {
  console.info(`TrueFit API listening on port ${config.PORT}`);
});

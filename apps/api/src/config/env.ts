import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_RESULTS_BUCKET: z.string().min(1).default('try-on-results'),
  GOOGLE_CLOUD_VISION_API_KEY: z.string().min(1).optional(),
  YOUCAM_API_KEY: z.string().min(1).optional(),
  YOUCAM_BASE_URL: z.string().url().default('https://yce-api-01.perfectcorp.com'),
  TRY_ON_POLL_INTERVAL_MS: z.coerce.number().int().min(50).max(10_000).default(1_000),
  TRY_ON_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_MODEL: z.string().min(1).default('openai/gpt-oss-120b'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export const loadConfig = (environment: NodeJS.ProcessEnv = process.env): AppConfig => {
  const parsed = environmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error('Invalid server configuration. Check required environment variables.');
  }

  return parsed.data;
};

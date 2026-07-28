import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_RESULTS_BUCKET: z.string().min(1).default('try-on-results'),
});

export const getEnv = (): z.infer<typeof publicEnvSchema> => {
  const parsed = publicEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error('Invalid web application configuration.');
  }

  return parsed.data;
};

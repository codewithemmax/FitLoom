import { createClient } from '@supabase/supabase-js';

import type { AppConfig } from '../config/env.js';

export type VerifiedUser = {
  id: string;
};

export type SupabaseAuthService = {
  getVerifiedUser(accessToken: string): Promise<VerifiedUser | null>;
};

export const createSupabaseAuthService = (config: AppConfig): SupabaseAuthService => {
  const client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    async getVerifiedUser(accessToken: string): Promise<VerifiedUser | null> {
      const { data, error } = await client.auth.getUser(accessToken);

      if (error !== null || data.user === null) {
        return null;
      }

      return { id: data.user.id };
    },
  };
};

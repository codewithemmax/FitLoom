import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getEnv } from './env';

export const createSupabaseServerClient = async (): Promise<ReturnType<typeof createServerClient>> => {
  const cookieStore = await cookies();
  const env = getEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions): void {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions): void {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
};

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPrefixes = ['/wardrobe', '/profile', '/onboarding', '/try-on'];

export const middleware = async (request: NextRequest): Promise<NextResponse> => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string): string | undefined {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions): void {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions): void {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const requiresAuth = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (requiresAuth && data.user === null) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
};

export const config = {
  matcher: ['/wardrobe/:path*', '/profile/:path*', '/onboarding/:path*', '/try-on/:path*'],
};

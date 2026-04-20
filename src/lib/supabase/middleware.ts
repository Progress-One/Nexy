import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup');
  const isAppPage = request.nextUrl.pathname.startsWith('/discover') ||
                    request.nextUrl.pathname.startsWith('/profile') ||
                    request.nextUrl.pathname.startsWith('/partners') ||
                    request.nextUrl.pathname.startsWith('/date') ||
                    request.nextUrl.pathname.startsWith('/chat') ||
                    request.nextUrl.pathname.startsWith('/settings') ||
                    request.nextUrl.pathname.startsWith('/premium') ||
                    request.nextUrl.pathname.startsWith('/onboarding');

  // Redirect to login if accessing app pages without auth
  if (!user && isAppPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect to discover if already logged in and accessing auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/discover';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

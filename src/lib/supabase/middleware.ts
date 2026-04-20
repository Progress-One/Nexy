import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { requireEnv } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  const jwtSecret = requireEnv('JWT_SECRET');
  const token = request.cookies.get('nexy_session')?.value;

  let user: { id: string; email: string } | null = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);
      user = { id: payload.sub as string, email: payload.email as string };
    } catch { /* expired/invalid */ }
  }

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup');
  const isAppPage = request.nextUrl.pathname.startsWith('/discover') ||
                    request.nextUrl.pathname.startsWith('/profile') ||
                    request.nextUrl.pathname.startsWith('/partners') ||
                    request.nextUrl.pathname.startsWith('/date') ||
                    request.nextUrl.pathname.startsWith('/chat') ||
                    request.nextUrl.pathname.startsWith('/settings') ||
                    request.nextUrl.pathname.startsWith('/premium') ||
                    request.nextUrl.pathname.startsWith('/onboarding') ||
                    request.nextUrl.pathname.startsWith('/visual-onboarding');

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

  return NextResponse.next({ request });
}

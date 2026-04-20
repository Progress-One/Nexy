import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

function getAdminEmails(): string[] {
  return (process.env['ADMIN_EMAILS'] || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Guards admin API routes. Returns NextResponse on failure (401/403),
 * or null if the caller is an admin and may proceed.
 *
 * Usage:
 *   export async function POST(req: Request) {
 *     const authError = await requireAdmin();
 *     if (authError) return authError;
 *     // ...admin logic
 *   }
 *
 * Admin emails are configured via ADMIN_EMAILS env var
 * (comma-separated, case-insensitive).
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('nexy_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let email: string | null = null;
  try {
    const secret = new TextEncoder().encode(
      process.env['JWT_SECRET'] || 'nexy-jwt-secret'
    );
    const { payload } = await jwtVerify(token, secret);
    email = typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed = getAdminEmails();
  if (allowed.length === 0 || !allowed.includes(email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

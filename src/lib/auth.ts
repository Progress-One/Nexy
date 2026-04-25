import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

export interface CurrentUser {
  id: string;
  email: string;
}

export function getJwtSecret(): Uint8Array {
  const value = process.env['JWT_SECRET'];
  if (!value) {
    throw new Error('Missing JWT_SECRET environment variable');
  }
  return new TextEncoder().encode(value);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('nexy_session')?.value;
  if (!token) return null;
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return { id: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}

export function isAdmin(user: CurrentUser | null): boolean {
  if (!user) return false;
  const list = (process.env['ADMIN_EMAILS'] || '').trim();
  if (!list) return false;
  const lcEmail = user.email.toLowerCase();
  return list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(lcEmail);
}

/**
 * Returns null if user is admin, or a 401/403 NextResponse if not.
 * Use at top of admin route handlers:
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

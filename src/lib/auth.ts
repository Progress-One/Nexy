import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

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

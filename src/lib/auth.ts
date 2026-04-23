import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export interface CurrentUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('nexy_session')?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env['JWT_SECRET'] || 'nexy-jwt-secret');
    const { payload } = await jwtVerify(token, secret);
    return { id: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}

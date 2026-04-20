import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { requireEnv } from '@/lib/env';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('nexy_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(requireEnv('JWT_SECRET'));
    const { payload } = await jwtVerify(token, secret);
    return NextResponse.json({ user: { id: payload.sub, email: payload.email } });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

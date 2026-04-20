import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import pg from 'pg';
import { randomUUID } from 'crypto';
import { hashPassword } from '@/lib/password';
import { requireEnv } from '@/lib/env';

const { Pool } = pg;
let _pool: pg.Pool | null = null;
function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 5 });
  return _pool;
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const pool = getPool();

  // Check if user exists
  const { rows: existing } = await pool.query(
    'SELECT id FROM profiles WHERE email = $1',
    [email],
  );

  if (existing.length) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  // Create user
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  await pool.query(
    'INSERT INTO profiles (id, email, password_hash, onboarding_completed) VALUES ($1, $2, $3, false)',
    [userId, email, passwordHash],
  );

  // Create JWT
  const secret = new TextEncoder().encode(requireEnv('JWT_SECRET'));
  const jwt = await new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set('nexy_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return NextResponse.json({ user: { id: userId, email } });
}

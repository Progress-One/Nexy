import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import pg from 'pg';
import { createHash } from 'crypto';

const { Pool } = pg;
let _pool: pg.Pool | null = null;
function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 5 });
  return _pool;
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const pool = getPool();

  // Find user by email
  const { rows } = await pool.query(
    'SELECT id, email, password_hash FROM profiles WHERE email = $1',
    [email],
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const user = rows[0];

  // Verify password (using same hash as signup)
  if (user.password_hash !== hashPassword(password)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Create JWT
  const secret = new TextEncoder().encode(process.env['JWT_SECRET'] || 'nexy-jwt-secret');
  const jwt = await new SignJWT({ sub: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set('nexy_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return NextResponse.json({ ok: true });
}

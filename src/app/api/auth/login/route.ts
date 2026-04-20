import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import pg from 'pg';
import { hashPassword, verifyPassword, isLegacyHash } from '@/lib/password';
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

  // Find user by email
  const { rows } = await pool.query(
    'SELECT id, email, password_hash FROM profiles WHERE email = $1',
    [email],
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const user = rows[0];

  // Verify password (supports legacy SHA256 and bcrypt; constant-time compare inside)
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Transparently upgrade legacy SHA256 hashes to bcrypt on successful login
  if (isLegacyHash(user.password_hash)) {
    try {
      const newHash = await hashPassword(password);
      await pool.query(
        'UPDATE profiles SET password_hash = $1 WHERE id = $2',
        [newHash, user.id],
      );
    } catch (err) {
      // Log but do not fail the login — user can still authenticate next time
      console.error('[login] failed to upgrade legacy hash:', err);
    }
  }

  // Create JWT
  const secret = new TextEncoder().encode(requireEnv('JWT_SECRET'));
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

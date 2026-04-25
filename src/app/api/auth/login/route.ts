import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import pg from 'pg';
import { createHash } from 'crypto';
import argon2 from 'argon2';
import { getJwtSecret } from '@/lib/auth';

const { Pool } = pg;
let _pool: pg.Pool | null = null;
function getPool() {
  if (_pool) return _pool;
  _pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 5 });
  return _pool;
}

function legacySha256Hash(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function verifyAndMaybeMigrate(
  pool: pg.Pool,
  userId: string,
  storedHash: string,
  password: string,
): Promise<boolean> {
  // Modern argon2 hashes start with `$argon2`
  if (storedHash.startsWith('$argon2')) {
    return argon2.verify(storedHash, password);
  }
  // Legacy SHA-256 hex. On success, lazily upgrade to argon2.
  if (storedHash === legacySha256Hash(password)) {
    const newHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    return true;
  }
  return false;
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

  // Verify password (argon2 with lazy SHA-256 migration)
  const ok = await verifyAndMaybeMigrate(pool, user.id, user.password_hash, password);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Create JWT
  const secret = getJwtSecret();
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

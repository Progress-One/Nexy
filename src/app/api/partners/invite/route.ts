import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateInviteCode } from '@/lib/matching';

const INVITE_EXPIRY_DAYS = 7;

interface InviteRow {
  id: string;
  invite_code: string | null;
  expires_at: string | null;
  status: string | null;
}

/**
 * GET — return the existing pending self-invite if any (one per user).
 * POST — create or reuse a pending invite for the current user. Returns invite_code & expires_at.
 *
 * Uses raw SQL because `partnerships.expires_at` and `partner_email` aren't in the
 * generated Kysely schema yet (legacy columns added post-codegen).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const pool = getDbPool();
  const res = await pool.query<InviteRow>(
    `SELECT id, invite_code, expires_at, status
     FROM partnerships
     WHERE inviter_id = $1
       AND status = 'pending'
       AND partner_id IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id],
  );

  const row = res.rows[0];
  if (!row) return NextResponse.json({ invite: null });

  return NextResponse.json({
    invite: {
      id: row.id,
      invite_code: row.invite_code,
      expires_at: row.expires_at,
      status: row.status,
    },
  });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const pool = getDbPool();

  // Reuse an existing valid invite if present
  const existing = await pool.query<InviteRow>(
    `SELECT id, invite_code, expires_at, status
     FROM partnerships
     WHERE inviter_id = $1
       AND status = 'pending'
       AND partner_id IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id],
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    return NextResponse.json({
      invite: {
        id: row.id,
        invite_code: row.invite_code,
        expires_at: row.expires_at,
        status: row.status,
      },
    });
  }

  // Otherwise create a new one
  const code = generateInviteCode();
  const expires = new Date();
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);

  const inserted = await pool.query<InviteRow>(
    `INSERT INTO partnerships (user_id, inviter_id, invite_code, status, expires_at)
     VALUES ($1, $1, $2, 'pending', $3)
     RETURNING id, invite_code, expires_at, status`,
    [user.id, code, expires.toISOString()],
  );

  const row = inserted.rows[0];
  return NextResponse.json({
    invite: {
      id: row.id,
      invite_code: row.invite_code,
      expires_at: row.expires_at,
      status: row.status,
    },
  });
}

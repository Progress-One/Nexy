import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Look up a pending invite by its code, with safety checks:
 *   - invite exists and status = 'pending'
 *   - current user is not the inviter (cannot accept own invite)
 *   - current user isn't already partnered with the inviter
 *
 * Returns a "valid" / "invalid" verdict so the join page can show the right UI
 * without leaking details about the inviter beyond what is needed.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { code } = await ctx.params;
  if (!code) return NextResponse.json({ error: 'missing code' }, { status: 400 });

  const invite = await db
    .selectFrom('partnerships')
    .select(['id', 'inviter_id', 'status', 'partner_id', 'nickname'])
    .where('invite_code', '=', code)
    .where('status', '=', 'pending')
    .executeTakeFirst();

  if (!invite) {
    return NextResponse.json({ valid: false, reason: 'not_found' });
  }

  if (invite.inviter_id === user.id) {
    return NextResponse.json({ valid: false, reason: 'self' });
  }

  // Check existing partnership (either direction) between these two users
  const existing = await db
    .selectFrom('partnerships')
    .select(['id', 'status'])
    .where((eb) =>
      eb.or([
        eb.and([
          eb('user_id', '=', user.id),
          eb('partner_id', '=', invite.inviter_id),
        ]),
        eb.and([
          eb('user_id', '=', invite.inviter_id),
          eb('partner_id', '=', user.id),
        ]),
      ]),
    )
    .executeTakeFirst();

  if (existing && existing.status === 'active') {
    return NextResponse.json({ valid: false, reason: 'already_partners' });
  }

  return NextResponse.json({
    valid: true,
    invite: { id: invite.id, inviter_id: invite.inviter_id, nickname: invite.nickname },
  });
}

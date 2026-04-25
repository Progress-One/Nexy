import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Accept a partnership invite. Server-side validates that:
 *   - the invite is pending
 *   - the caller is not the inviter
 *   - they aren't already partnered (active row)
 *
 * Updates the original invite to status='active' (filling in partner_id),
 * and creates a reverse partnership row so both directions show in queries.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { code } = await ctx.params;
  if (!code) return NextResponse.json({ error: 'missing code' }, { status: 400 });

  const invite = await db
    .selectFrom('partnerships')
    .selectAll()
    .where('invite_code', '=', code)
    .where('status', '=', 'pending')
    .executeTakeFirst();

  if (!invite || !invite.id) {
    return NextResponse.json({ error: 'invite not found' }, { status: 404 });
  }

  if (invite.inviter_id === user.id) {
    return NextResponse.json({ error: 'cannot accept own invite' }, { status: 400 });
  }

  // Reject if a partnership already exists between these two users
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
    return NextResponse.json({ error: 'already partners' }, { status: 400 });
  }

  // Update the invite row to active
  await db
    .updateTable('partnerships')
    .set({ partner_id: user.id, status: 'active' } as never)
    .where('id', '=', invite.id)
    .execute();

  // Create reverse-direction row (the accepting user as user_id)
  await db
    .insertInto('partnerships')
    .values({
      user_id: user.id,
      partner_id: invite.inviter_id,
      inviter_id: invite.inviter_id,
      status: 'active',
    } as never)
    .execute();

  return NextResponse.json({
    ok: true,
    partnership: { id: invite.id, inviter_id: invite.inviter_id },
  });
}

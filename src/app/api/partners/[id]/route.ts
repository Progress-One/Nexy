import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Single partnership detail. Caller MUST be one of its members.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const row = await db
    .selectFrom('partnerships')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (row.user_id !== user.id && row.partner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Compute the "other" user id from the caller's perspective
  const otherId = row.user_id === user.id ? row.partner_id : row.user_id;

  return NextResponse.json({ partnership: { ...row, partner_id: otherId } });
}

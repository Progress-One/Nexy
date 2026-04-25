import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Single date detail (with the parent partnership). Caller must be a partnership member.
 */
async function loadDateForCaller(dateId: string, userId: string) {
  const dateRow = await db
    .selectFrom('dates')
    .selectAll()
    .where('id', '=', dateId)
    .executeTakeFirst();
  if (!dateRow) return { status: 404 as const };

  if (!dateRow.partnership_id) {
    return { status: 500 as const, error: 'date is missing partnership_id' };
  }

  const partnership = await db
    .selectFrom('partnerships')
    .select(['id', 'user_id', 'partner_id', 'nickname', 'status'])
    .where('id', '=', dateRow.partnership_id)
    .executeTakeFirst();
  if (!partnership) return { status: 404 as const };
  if (partnership.user_id !== userId && partnership.partner_id !== userId) {
    return { status: 403 as const };
  }

  const otherId = partnership.user_id === userId ? partnership.partner_id : partnership.user_id;
  return {
    status: 200 as const,
    dateRow,
    partnership: { ...partnership, partner_id: otherId },
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const result = await loadDateForCaller(id, user.id);
  if (result.status === 404) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (result.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (result.status === 500) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ date: result.dateRow, partnership: result.partnership });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const result = await loadDateForCaller(id, user.id);
  if (result.status === 404) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (result.status === 403) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (result.status === 500) return NextResponse.json({ error: result.error }, { status: 500 });

  const body = (await req.json()) as { status?: string };
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  await db.updateTable('dates').set(updates as never).where('id', '=', id).execute();
  return NextResponse.json({ ok: true });
}

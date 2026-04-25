import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Record a date_response for the current user. Caller must be in the parent partnership.
 * Body: { scene_id, answer }
 *
 * If after this insert the partner has also answered something for this date, the
 * date row is marked as 'ready' so callers can show the results screen.
 *
 * Returns: { ok: true, partnerCompleted: boolean }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: dateId } = await ctx.params;
  if (!dateId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const body = (await req.json()) as { scene_id?: string; answer?: string };
  if (!body.scene_id || !body.answer) {
    return NextResponse.json({ error: 'scene_id and answer required' }, { status: 400 });
  }

  // Verify caller is a member of the parent partnership
  const dateRow = await db
    .selectFrom('dates')
    .select(['id', 'partnership_id'])
    .where('id', '=', dateId)
    .executeTakeFirst();
  if (!dateRow || !dateRow.partnership_id) {
    return NextResponse.json({ error: 'date not found' }, { status: 404 });
  }
  const partnership = await db
    .selectFrom('partnerships')
    .select(['user_id', 'partner_id'])
    .where('id', '=', dateRow.partnership_id)
    .executeTakeFirst();
  if (!partnership) {
    return NextResponse.json({ error: 'partnership not found' }, { status: 404 });
  }
  if (partnership.user_id !== user.id && partnership.partner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const partnerUserId =
    partnership.user_id === user.id ? partnership.partner_id : partnership.user_id;

  // Insert the response
  await db
    .insertInto('date_responses')
    .values({
      date_id: dateId,
      user_id: user.id,
      scene_id: body.scene_id,
      answer: body.answer,
    } as never)
    .execute();

  // Has partner already answered something?
  let partnerCompleted = false;
  if (partnerUserId) {
    const partnerRows = await db
      .selectFrom('date_responses')
      .select(['id'])
      .where('date_id', '=', dateId)
      .where('user_id', '=', partnerUserId)
      .limit(1)
      .execute();
    partnerCompleted = partnerRows.length > 0;
    if (partnerCompleted) {
      await db
        .updateTable('dates')
        .set({ status: 'ready' } as never)
        .where('id', '=', dateId)
        .execute();
    }
  }

  return NextResponse.json({ ok: true, partnerCompleted });
}

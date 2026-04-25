import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET — list dates for partnerships the current user is a member of, with
 *   the partner's nickname pre-joined.
 * POST — create a new date. Validates the caller is in the partnership.
 *   Body: { partnership_id, mood }
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const partnerships = await db
    .selectFrom('partnerships')
    .select(['id', 'user_id', 'partner_id', 'nickname', 'status'])
    .where((eb) =>
      eb.or([eb('user_id', '=', user.id), eb('partner_id', '=', user.id)]),
    )
    .where('status', '=', 'active')
    .execute();

  const partnershipIds = partnerships.map((p) => p.id).filter(Boolean) as string[];
  if (partnershipIds.length === 0) {
    return NextResponse.json({ dates: [], partnerships: [] });
  }

  const dates = await db
    .selectFrom('dates')
    .selectAll()
    .where('partnership_id', 'in', partnershipIds)
    .orderBy('created_at', 'desc')
    .execute();

  const partnershipMap = new Map(
    partnerships.map((p) => [
      p.id,
      { id: p.id, nickname: p.nickname || 'Партнёр' },
    ]),
  );

  const datesWithPartners = dates.map((d) => ({
    ...d,
    partnerName: partnershipMap.get(d.partnership_id)?.nickname ?? 'Партнёр',
  }));

  return NextResponse.json({
    dates: datesWithPartners,
    partnerships: Array.from(partnershipMap.values()),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as { partnership_id?: string; mood?: string | null };
  if (!body.partnership_id) {
    return NextResponse.json({ error: 'partnership_id required' }, { status: 400 });
  }

  // Verify caller is a member of this partnership
  const partnership = await db
    .selectFrom('partnerships')
    .select(['id', 'user_id', 'partner_id', 'status'])
    .where('id', '=', body.partnership_id)
    .executeTakeFirst();

  if (!partnership) {
    return NextResponse.json({ error: 'partnership not found' }, { status: 404 });
  }
  if (partnership.user_id !== user.id && partnership.partner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const inserted = await db
    .insertInto('dates')
    .values({
      partnership_id: body.partnership_id,
      initiator_id: user.id,
      mood: body.mood ?? null,
      status: 'pending',
    } as never)
    .returning(['id'])
    .executeTakeFirst();

  return NextResponse.json({ date: { id: inserted?.id ?? null } });
}

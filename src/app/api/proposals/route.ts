import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface CreateBody {
  partnership_id: string;
  scene_id?: string;
  dimension?: string;
}

/**
 * Create a proposal from the current user to their partner.
 * Resolves the partner via partnership membership; never trusts a client-supplied
 * to_user_id.
 *
 * If `scene_id` is omitted but `dimension` is provided, the server picks a
 * random V2 scene tagged with that dimension.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as CreateBody;
  if (!body.partnership_id) {
    return NextResponse.json({ error: 'partnership_id required' }, { status: 400 });
  }
  if (!body.scene_id && !body.dimension) {
    return NextResponse.json(
      { error: 'scene_id or dimension required' },
      { status: 400 },
    );
  }

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
  const partnerUserId =
    partnership.user_id === user.id ? partnership.partner_id : partnership.user_id;
  if (!partnerUserId) {
    return NextResponse.json({ error: 'partnership has no partner yet' }, { status: 400 });
  }

  // Resolve scene_id from dimension if not given
  let sceneId: string | null = body.scene_id ?? null;
  if (!sceneId && body.dimension) {
    const candidates = await db
      .selectFrom('scenes')
      .select(['id'])
      .where('version', '=', 2)
      .where('is_active', '=', true)
      .where('tags', '@>', [body.dimension] as never)
      .limit(5)
      .execute();
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      sceneId = pick.id ?? null;
    }
  }

  if (!sceneId) {
    return NextResponse.json(
      { error: 'no scene matched dimension' },
      { status: 404 },
    );
  }

  const inserted = await db
    .insertInto('proposals')
    .values({
      from_user_id: user.id,
      to_user_id: partnerUserId,
      scene_id: sceneId,
      dimension: body.dimension ?? null,
      status: 'pending',
    } as never)
    .returning(['id'])
    .executeTakeFirst();

  return NextResponse.json({ proposal: { id: inserted?.id ?? null } });
}

/**
 * PATCH — update status of a proposal addressed to (or from) the current user.
 * Body: { id, status }
 *
 * Allowed transitions handled by the caller: pending → shown → answered.
 */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  // Only the recipient (to_user_id) is allowed to flip status (shown / answered).
  const proposal = await db
    .selectFrom('proposals')
    .select(['id', 'to_user_id', 'from_user_id'])
    .where('id', '=', body.id)
    .executeTakeFirst();
  if (!proposal) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (proposal.to_user_id !== user.id && proposal.from_user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await db
    .updateTable('proposals')
    .set({ status: body.status } as never)
    .where('id', '=', body.id)
    .execute();

  return NextResponse.json({ ok: true });
}

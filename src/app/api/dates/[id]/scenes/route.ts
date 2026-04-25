import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getTagBasedMatches, type TagPreference } from '@/lib/matching';
import type { Scene } from '@/lib/types';

const MOOD_INTENSITY: Record<string, { min: number; max: number }> = {
  tender: { min: 1, max: 2 },
  playful: { min: 1, max: 3 },
  passionate: { min: 2, max: 4 },
  intense: { min: 3, max: 5 },
  surprise: { min: 1, max: 5 },
};

/**
 * Build the scene queue for a date session.
 *
 * PRIVACY: server-side runs `getTagBasedMatches` over both users' tag_preferences.
 * Returned shape contains only:
 *   - scenes the caller still has to answer
 *   - whether the partner has already submitted any answer (for waiting-state UI)
 * Raw partner tags never leave the server.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: dateId } = await ctx.params;
  if (!dateId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  // 1. Load date + partnership; verify caller membership
  const dateRow = await db
    .selectFrom('dates')
    .select(['id', 'partnership_id', 'mood'])
    .where('id', '=', dateId)
    .executeTakeFirst();
  if (!dateRow || !dateRow.partnership_id) {
    return NextResponse.json({ error: 'date not found' }, { status: 404 });
  }

  const partnership = await db
    .selectFrom('partnerships')
    .select(['id', 'user_id', 'partner_id'])
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
  if (!partnerUserId) {
    return NextResponse.json({ scenes: [], partnerCompleted: false });
  }

  // 2. Compute tag-based matches server-side
  const [myTags, partnerTags] = await Promise.all([
    db
      .selectFrom('tag_preferences')
      .select(['tag_ref', 'interest_level', 'role_preference'])
      .where('user_id', '=', user.id)
      .execute(),
    db
      .selectFrom('tag_preferences')
      .select(['tag_ref', 'interest_level', 'role_preference'])
      .where('user_id', '=', partnerUserId)
      .execute(),
  ]);

  const matches = getTagBasedMatches(
    (myTags as unknown as TagPreference[]).filter((t) => t.tag_ref),
    (partnerTags as unknown as TagPreference[]).filter((t) => t.tag_ref),
  );
  const matchedTags = matches.matches.map((m) => m.dimension);

  // 3. Already-answered scenes for this date by current user
  const answered = await db
    .selectFrom('date_responses')
    .select(['scene_id'])
    .where('date_id', '=', dateId)
    .where('user_id', '=', user.id)
    .execute();
  const answeredIds = answered.map((a) => a.scene_id).filter(Boolean) as string[];

  // 4. Has the partner answered anything yet?
  const partnerAnswered = await db
    .selectFrom('date_responses')
    .select(['id'])
    .where('date_id', '=', dateId)
    .where('user_id', '=', partnerUserId)
    .limit(1)
    .execute();
  const partnerCompleted = partnerAnswered.length > 0;

  // 5. Fetch scenes
  const intensity =
    MOOD_INTENSITY[dateRow.mood ?? 'surprise'] ?? MOOD_INTENSITY.surprise;

  let query = db
    .selectFrom('scenes')
    .selectAll()
    .where('version', '=', 2)
    .where('is_active', '=', true)
    .where('intensity', '>=', intensity.min)
    .where('intensity', '<=', intensity.max)
    .limit(5);

  if (matchedTags.length > 0) {
    query = query.where('tags', '&&', matchedTags as never);
  }
  if (answeredIds.length > 0) {
    query = query.where('id', 'not in', answeredIds);
  }

  const scenes = (await query.execute()) as unknown as Scene[];
  return NextResponse.json({ scenes, partnerCompleted });
}

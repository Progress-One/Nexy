import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getTagBasedMatches, type TagPreference } from '@/lib/matching';

/**
 * Privacy-critical: compute mutual matches server-side from both users'
 * tag_preferences. Return ONLY the safe-to-show derived shape — never the
 * partner's raw tag preferences.
 *
 * Caller MUST be a member of the partnership.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  // 1. Load partnership and verify membership
  const partnership = await db
    .selectFrom('partnerships')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!partnership) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (partnership.user_id !== user.id && partnership.partner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const partnerUserId =
    partnership.user_id === user.id ? partnership.partner_id : partnership.user_id;

  if (!partnerUserId) {
    // Pending partnership without a partner yet — return empty matches.
    return NextResponse.json({
      matches: [],
      partnerDoesntWant: [],
      partnership: {
        id: partnership.id,
        nickname: partnership.nickname,
        status: partnership.status,
        partner_id: null,
      },
    });
  }

  // 2. Load both users' tag_preferences
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

  // Coerce the row shape to TagPreference (drop nulls)
  const myTagPrefs = (myTags as unknown as TagPreference[]).filter(
    (t) => t.tag_ref != null,
  );
  const partnerTagPrefs = (partnerTags as unknown as TagPreference[]).filter(
    (t) => t.tag_ref != null,
  );

  const thresholdParam = req.nextUrl.searchParams.get('threshold');
  const threshold = thresholdParam ? Number(thresholdParam) : undefined;

  const result = getTagBasedMatches(myTagPrefs, partnerTagPrefs, threshold ?? 50);

  // 3. Return safe shape — NEVER include partnerTags raw
  return NextResponse.json({
    matches: result.matches,
    partnerDoesntWant: result.partnerDoesntWant,
    // iWantButHidden intentionally omitted — only matches and partner_no should be visible
    partnership: {
      id: partnership.id,
      nickname: partnership.nickname,
      status: partnership.status,
      partner_id: partnerUserId,
    },
  });
}

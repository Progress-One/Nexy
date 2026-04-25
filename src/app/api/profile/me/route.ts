import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Returns the current user's profile, preferences, and answer count.
 * Powers the profile page.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [profile, preferenceProfile, responsesCountRow] = await Promise.all([
    db.selectFrom('profiles').selectAll().where('id', '=', user.id).executeTakeFirst(),
    db
      .selectFrom('preference_profiles')
      .select(['preferences'])
      .where('user_id', '=', user.id)
      .executeTakeFirst(),
    db
      .selectFrom('scene_responses')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('user_id', '=', user.id)
      .executeTakeFirst(),
  ]);

  const answeredCount = Number(responsesCountRow?.count ?? 0);

  return NextResponse.json({
    profile: profile ?? null,
    preferences: preferenceProfile?.preferences ?? null,
    stats: { answered: answeredCount },
  });
}

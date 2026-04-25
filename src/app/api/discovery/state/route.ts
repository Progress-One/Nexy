import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Aggregate discovery state for the current user — one round-trip instead of N.
 * Returns: profile, flowState, sceneResponses, bodyMapResponses, preferenceProfile.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [profile, flowState, sceneResponses, bodyMapResponses, preferenceProfile] = await Promise.all([
    db
      .selectFrom('profiles')
      .selectAll()
      .where('id', '=', user.id)
      .executeTakeFirst(),
    db
      .selectFrom('user_flow_state')
      .selectAll()
      .where('user_id', '=', user.id)
      .executeTakeFirst(),
    db
      .selectFrom('scene_responses')
      .select(['scene_id', 'question_type'])
      .where('user_id', '=', user.id)
      .execute(),
    db
      .selectFrom('body_map_responses')
      .select(['activity_id', 'pass'])
      .where('user_id', '=', user.id)
      .execute(),
    db
      .selectFrom('preference_profiles')
      .select(['preferences'])
      .where('user_id', '=', user.id)
      .executeTakeFirst(),
  ]);

  return NextResponse.json({
    profile: profile ?? null,
    flowState: flowState ?? null,
    sceneResponses,
    bodyMapResponses,
    preferenceProfile: preferenceProfile ?? null,
  });
}

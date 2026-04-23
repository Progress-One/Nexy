import { NextResponse } from 'next/server';
import { db, getDbPool } from '@/lib/db';
import { sql } from 'kysely';

export async function GET() {
  try {
    // Get all profiles - use raw pool query for email field (not yet in generated schema)
    const pool = getDbPool();
    const profilesRes = await pool.query<{
      id: string;
      email: string | null;
      gender: string | null;
      interested_in: string | null;
      onboarding_completed: boolean | null;
      created_at: Date | null;
    }>(
      'SELECT id, email, gender, interested_in, onboarding_completed, created_at FROM profiles ORDER BY created_at DESC'
    );
    const profiles = profilesRes.rows;

    // Get response counts for each user
    const usersWithCounts = await Promise.all(
      profiles.map(async (profile) => {
        // Count scene responses
        const sceneCountRow = await db
          .selectFrom('scene_responses')
          .select(sql<number>`count(*)::int`.as('count'))
          .where('user_id', '=', profile.id)
          .executeTakeFirstOrThrow();

        // Count body map responses
        const bodyMapCountRow = await db
          .selectFrom('body_map_responses')
          .select(sql<number>`count(*)::int`.as('count'))
          .where('user_id', '=', profile.id)
          .executeTakeFirstOrThrow();

        // Check if has flow state
        const flowState = await db
          .selectFrom('user_flow_state')
          .select(['seen_scenes', 'calibration_complete'])
          .where('user_id', '=', profile.id)
          .executeTakeFirst();

        const sceneCount = sceneCountRow.count || 0;
        const bodyMapCount = bodyMapCountRow.count || 0;

        return {
          ...profile,
          email: profile.email || 'unknown',
          scene_responses_count: sceneCount,
          body_map_responses_count: bodyMapCount,
          seen_scenes_count: flowState?.seen_scenes?.length || 0,
          calibration_complete: flowState?.calibration_complete || false,
          total_responses: sceneCount + bodyMapCount,
        };
      })
    );

    // Sort by total responses (most active first)
    usersWithCounts.sort((a, b) => b.total_responses - a.total_responses);

    return NextResponse.json({ users: usersWithCounts });
  } catch (error) {
    console.error('[Users] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

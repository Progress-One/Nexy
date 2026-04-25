import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'kysely';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Upsert the current user's user_flow_state row.
 * Body accepts a partial set of: tag_scores, body_map_skipped, calibration_complete,
 *   give_receive_balance, preferred_intensity, seen_categories, seen_scenes.
 *
 * Special-case: { body_map_skipped: true } merges into the existing tag_scores JSON
 * to preserve prior values (legacy clients only stored that flag inside tag_scores).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as {
    tag_scores?: Record<string, unknown>;
    body_map_skipped?: boolean;
    calibration_complete?: boolean;
    give_receive_balance?: number;
    preferred_intensity?: number;
    seen_categories?: string[];
    seen_scenes?: string[];
  };

  // If body_map_skipped is set, fold it into tag_scores (preserving existing values)
  let tagScoresMerged: Record<string, unknown> | undefined;
  if (body.body_map_skipped !== undefined) {
    const existing = await db
      .selectFrom('user_flow_state')
      .select(['tag_scores'])
      .where('user_id', '=', user.id)
      .executeTakeFirst();

    const existingScores = (existing?.tag_scores as Record<string, unknown> | null) ?? {};
    tagScoresMerged = {
      ...existingScores,
      ...(body.tag_scores ?? {}),
      body_map_skipped: body.body_map_skipped,
    };
  } else if (body.tag_scores !== undefined) {
    tagScoresMerged = body.tag_scores;
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    updated_at: sql`now()`,
  };
  if (tagScoresMerged !== undefined) row.tag_scores = tagScoresMerged;
  if (body.calibration_complete !== undefined) row.calibration_complete = body.calibration_complete;
  if (body.give_receive_balance !== undefined) row.give_receive_balance = body.give_receive_balance;
  if (body.preferred_intensity !== undefined) row.preferred_intensity = body.preferred_intensity;
  if (body.seen_categories !== undefined) row.seen_categories = body.seen_categories;
  if (body.seen_scenes !== undefined) row.seen_scenes = body.seen_scenes;

  const updateCols = Object.fromEntries(
    Object.keys(row).filter((k) => k !== 'user_id').map((k) => [k, row[k]])
  );

  await db
    .insertInto('user_flow_state')
    .values(row as never)
    .onConflict((oc) => oc.columns(['user_id']).doUpdateSet(updateCols as never))
    .execute();

  return NextResponse.json({ ok: true });
}

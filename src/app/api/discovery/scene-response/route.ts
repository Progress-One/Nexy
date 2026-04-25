import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'kysely';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface SceneResponseBody {
  scene_id: string;
  scene_slug?: string | null;
  question_type?: string | null;
  answer?: unknown;
  skipped?: boolean;
  liked?: boolean | null;
  rating?: number | null;
  elements_selected?: string[] | null;
  element_responses?: unknown;
  follow_up_answers?: unknown;
  question_asked?: string | null;
  profile_updates?: unknown;
}

/**
 * Upsert a scene_response for the current user.
 * Conflict key: (user_id, scene_id) — preserves the existing client semantics.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as SceneResponseBody;
  if (!body.scene_id) {
    return NextResponse.json({ error: 'scene_id required' }, { status: 400 });
  }

  // Build the row, omitting undefined keys so the DB defaults / triggers apply.
  const row: Record<string, unknown> = {
    user_id: user.id,
    scene_id: body.scene_id,
  };
  if (body.scene_slug !== undefined) row.scene_slug = body.scene_slug;
  if (body.question_type !== undefined) row.question_type = body.question_type;
  if (body.answer !== undefined) row.answer = body.answer;
  if (body.skipped !== undefined) row.skipped = body.skipped;
  if (body.liked !== undefined) row.liked = body.liked;
  if (body.rating !== undefined) row.rating = body.rating;
  if (body.elements_selected !== undefined) row.elements_selected = body.elements_selected;
  if (body.element_responses !== undefined) row.element_responses = body.element_responses;
  if (body.follow_up_answers !== undefined) row.follow_up_answers = body.follow_up_answers;
  if (body.question_asked !== undefined) row.question_asked = body.question_asked;
  if (body.profile_updates !== undefined) row.profile_updates = body.profile_updates;
  row.updated_at = sql`now()`;

  const updateCols = Object.fromEntries(
    Object.keys(row).filter((k) => k !== 'user_id' && k !== 'scene_id').map((k) => [k, row[k]])
  );

  await db
    .insertInto('scene_responses')
    .values(row as never)
    .onConflict((oc) => oc.columns(['user_id', 'scene_id']).doUpdateSet(updateCols as never))
    .execute();

  return NextResponse.json({ ok: true });
}

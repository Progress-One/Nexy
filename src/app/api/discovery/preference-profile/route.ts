import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'kysely';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET — return the current user's preference_profile (preferences JSON only).
 * POST — upsert the current user's preferences. Conflict key: user_id.
 *   Body: { preferences: Json }
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const row = await db
    .selectFrom('preference_profiles')
    .select(['preferences'])
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  return NextResponse.json({ preferences: row?.preferences ?? null });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as { preferences?: unknown };
  if (body.preferences === undefined) {
    return NextResponse.json({ error: 'preferences required' }, { status: 400 });
  }

  await db
    .insertInto('preference_profiles')
    .values({
      user_id: user.id,
      preferences: body.preferences as never,
      updated_at: sql`now()`,
    } as never)
    .onConflict((oc) =>
      oc.columns(['user_id']).doUpdateSet({
        preferences: body.preferences as never,
        updated_at: sql`now()`,
      } as never)
    )
    .execute();

  return NextResponse.json({ ok: true });
}

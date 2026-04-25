import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'kysely';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_FIELDS: ReadonlyArray<keyof PatchBody> = [
  'language',
  'gender',
  'interested_in',
  'openness_level',
  'onboarding_completed',
  'visual_onboarding_completed',
];

interface PatchBody {
  language?: 'en' | 'ru';
  gender?: 'male' | 'female';
  interested_in?: 'male' | 'female' | 'both';
  openness_level?: string;
  onboarding_completed?: boolean;
  visual_onboarding_completed?: boolean;
}

/**
 * GET — minimal profile fields for the settings page.
 * PATCH — update a whitelisted set of profile fields for the current user.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const profile = await db
    .selectFrom('profiles')
    .select([
      'id',
      'gender',
      'interested_in',
      'language',
      'onboarding_completed',
      'visual_onboarding_completed',
      'openness_level',
    ])
    .where('id', '=', user.id)
    .executeTakeFirst();

  return NextResponse.json({ profile: profile ?? null });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as PatchBody;
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  updates.updated_at = sql`now()`;

  await db
    .updateTable('profiles')
    .set(updates as never)
    .where('id', '=', user.id)
    .execute();

  return NextResponse.json({ ok: true });
}

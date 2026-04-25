import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Scene } from '@/lib/types';

/**
 * Returns onboarding scenes (`is_onboarding=true, is_active=true`),
 * optionally filtered by gender, excluding scenes the current user already answered.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const gender = params.get('gender');

  // Already-answered scene_ids
  const answered = await db
    .selectFrom('scene_responses')
    .select(['scene_id'])
    .where('user_id', '=', user.id)
    .execute();
  const answeredIds = new Set(answered.map((r) => r.scene_id).filter(Boolean));

  let query = db
    .selectFrom('scenes')
    .selectAll()
    .where('is_onboarding', '=', true)
    .where('is_active', '=', true)
    .orderBy('onboarding_order', 'asc')
    .orderBy('priority', 'asc');

  if (gender === 'male' || gender === 'female') {
    const g = gender;
    query = query.where((eb) =>
      eb.or([eb('for_gender', '=', g), eb('for_gender', 'is', null)])
    );
  }

  const rows = await query.execute();
  const unanswered = rows.filter((s) => s.id && !answeredIds.has(s.id));

  return NextResponse.json({ scenes: unanswered as unknown as Scene[] });
}

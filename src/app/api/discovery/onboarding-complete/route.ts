import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'kysely';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Mark visual onboarding as complete for the current user.
 * Body (optional): { visual_onboarding_completed?: boolean } — defaults to true.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { visual_onboarding_completed?: boolean };
  const flag = body.visual_onboarding_completed ?? true;

  await db
    .updateTable('profiles')
    .set({ visual_onboarding_completed: flag, updated_at: sql`now()` } as never)
    .where('id', '=', user.id)
    .execute();

  return NextResponse.json({ ok: true });
}

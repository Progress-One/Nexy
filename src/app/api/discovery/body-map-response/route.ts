import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface BodyMapBody {
  activity_id: string;
  pass: string;
  zones_selected: string[];
}

/**
 * Upsert a body_map_response for the current user.
 * Conflict key: (user_id, activity_id, pass).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as BodyMapBody;
  if (!body.activity_id || !body.pass) {
    return NextResponse.json({ error: 'activity_id and pass required' }, { status: 400 });
  }

  await db
    .insertInto('body_map_responses')
    .values({
      user_id: user.id,
      activity_id: body.activity_id,
      pass: body.pass,
      zones_selected: body.zones_selected ?? [],
    } as never)
    .onConflict((oc) =>
      oc.columns(['user_id', 'activity_id', 'pass']).doUpdateSet({
        zones_selected: body.zones_selected ?? [],
      } as never)
    )
    .execute();

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface TrackBody {
  event_name: string;
  event_data?: Record<string, unknown>;
}

/**
 * Record an analytics event for the current user.
 * Fire-and-forget on the client; never trust client-supplied user_id.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as TrackBody;
  if (!body.event_name) {
    return NextResponse.json({ error: 'event_name required' }, { status: 400 });
  }

  await db
    .insertInto('analytics_events')
    .values({
      user_id: user.id,
      event_name: body.event_name,
      event_data: (body.event_data ?? {}) as never,
    } as never)
    .execute();

  return NextResponse.json({ ok: true });
}

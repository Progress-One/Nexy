import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30');

  const since = new Date();
  since.setDate(since.getDate() - days);

  const eventNames = [
    'onboarding_start',
    'onboarding_step_gender',
    'onboarding_step_interested',
    'onboarding_step_openness',
    'onboarding_complete',
  ];

  try {
    const events = await db
      .selectFrom('analytics_events')
      .select(['event_name', 'user_id', 'created_at'])
      .where('created_at', '>=', since)
      .where('event_name', 'in', eventNames)
      .orderBy('created_at', 'asc')
      .execute();

    // Count unique users per event
    const funnel: Record<string, Set<string>> = {};
    for (const event of events) {
      if (!event.event_name || !event.user_id) continue;
      if (!funnel[event.event_name]) funnel[event.event_name] = new Set();
      funnel[event.event_name].add(event.user_id);
    }

    const steps = eventNames;

    const funnelData = steps.map((step, i) => {
      const count = funnel[step]?.size || 0;
      const prevCount = i === 0 ? count : (funnel[steps[i - 1]]?.size || 0);
      const dropoff = prevCount > 0 ? Math.round((1 - count / prevCount) * 100) : 0;

      return {
        step,
        users: count,
        dropoff: i === 0 ? 0 : dropoff,
      };
    });

    return NextResponse.json({ funnel: funnelData, days, total_events: events.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

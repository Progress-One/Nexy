import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get event counts for onboarding funnel
  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_name, user_id, created_at')
    .gte('created_at', since.toISOString())
    .in('event_name', [
      'onboarding_start',
      'onboarding_step_gender',
      'onboarding_step_interested',
      'onboarding_step_openness',
      'onboarding_complete',
    ])
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count unique users per event
  const funnel: Record<string, Set<string>> = {};
  for (const event of events || []) {
    if (!funnel[event.event_name]) funnel[event.event_name] = new Set();
    funnel[event.event_name].add(event.user_id);
  }

  const steps = [
    'onboarding_start',
    'onboarding_step_gender',
    'onboarding_step_interested',
    'onboarding_step_openness',
    'onboarding_complete',
  ];

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

  return NextResponse.json({ funnel: funnelData, days, total_events: events?.length || 0 });
}

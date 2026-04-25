import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * Returns the current user's subscription status — used by premium and propose pages.
 * `isPremium` is true iff there's an active subscription with plan != 'free'.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sub = await db
    .selectFrom('subscriptions')
    .select(['plan', 'status', 'current_period_end'])
    .where('user_id', '=', user.id)
    .executeTakeFirst();

  if (!sub) {
    return NextResponse.json({
      isPremium: false,
      plan: null,
      status: null,
      current_period_end: null,
    });
  }

  const isPremium = !!sub.plan && sub.plan !== 'free' && sub.status === 'active';
  return NextResponse.json({
    isPremium,
    plan: sub.plan ?? null,
    status: sub.status ?? null,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end as unknown as string).toISOString()
      : null,
  });
}

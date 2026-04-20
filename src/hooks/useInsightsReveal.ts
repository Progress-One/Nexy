'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  computeUserInsights,
  getInsightsShownAt,
  markInsightsShown,
  type InsightsData,
} from '@/lib/insights';
import type { Locale } from '@/lib/types';

/**
 * Показывает пользователю "aha" экран с его профилем после
 * N ответов (по умолчанию 15). Один раз за всё время — после
 * подтверждения флаг сохраняется в user_flow_state.insights_shown_at.
 *
 * Используется вместе с useDiscovery — передай его `answeredCount`:
 *
 *   const { answeredCount } = useDiscovery();
 *   const { shouldShow, insights, acknowledge } = useInsightsReveal(answeredCount, locale);
 *
 *   if (shouldShow && insights) {
 *     return <InsightsReveal data={insights} locale={locale} onContinue={acknowledge} />;
 *   }
 */
export const INSIGHTS_REVEAL_AT = 15;

export function useInsightsReveal(answeredCount: number, locale: Locale) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [alreadyShown, setAlreadyShown] = useState<boolean | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  // Load user + flag once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      const shownAt = await getInsightsShownAt(supabase, user.id);
      if (!cancelled) setAlreadyShown(shownAt !== null);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // When threshold is crossed for the first time, compute insights
  useEffect(() => {
    if (!userId || alreadyShown !== false) return;
    if (answeredCount < INSIGHTS_REVEAL_AT) return;
    if (insights) return;

    let cancelled = false;
    (async () => {
      const data = await computeUserInsights(supabase, userId, locale);
      if (!cancelled) setInsights(data);
    })();
    return () => { cancelled = true; };
  }, [userId, alreadyShown, answeredCount, insights, supabase, locale]);

  const acknowledge = useCallback(async () => {
    if (!userId) return;
    await markInsightsShown(supabase, userId);
    setAlreadyShown(true);
  }, [supabase, userId]);

  const shouldShow =
    alreadyShown === false &&
    answeredCount >= INSIGHTS_REVEAL_AT &&
    insights !== null;

  return { shouldShow, insights, acknowledge };
}

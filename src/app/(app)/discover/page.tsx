'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IntroSlideV3 } from '@/components/discovery/IntroSlideV3';
import {
  SwipeCardsGroupV3,
  type SwipeCardResponse,
} from '@/components/discovery/SwipeCardsGroupV3';
import {
  SceneRendererV3,
  type SceneV3Response,
} from '@/components/discovery/SceneRendererV3';
import {
  buildDiscoveryContextV3,
  getNextDiscoveryScenesV3,
  markClarificationShown,
  type DiscoveryContextV3,
  type NextScenesResult,
} from '@/lib/scene-sequencing-v3';
import { updateTagPreferencesFromSwipe } from '@/lib/tag-preferences';
import { getLocale, t } from '@/lib/locale';
import type {
  Locale,
  Profile,
  SceneV2Extended,
  BodyGender,
} from '@/lib/types';

type DiscoveryPhase =
  | 'loading'
  | 'intro'
  | 'swipe_group'
  | 'single_scene'
  | 'completed'
  | 'error';

/**
 * Discovery flow (V3 architecture).
 *
 * Flow:
 * 1. Build context from profile + existing responses.
 * 2. If user has no main_question answers yet, seed with is_onboarding=true
 *    main_question scenes as a swipe group.
 * 3. Otherwise ask `getNextDiscoveryScenesV3` for clarifications triggered by
 *    the user's positive main_question responses.
 * 4. If result contains introSlide → show IntroSlideV3 before the group.
 * 5. scenes.length > 1 → SwipeCardsGroupV3 (swipe deck).
 *    scenes.length === 1 → SceneRendererV3 (single interactive scene).
 * 6. On completion of a batch, refresh context and load next batch until
 *    the sequencer returns no more scenes → phase 'completed'.
 */
export default function DiscoverPage() {
  const [phase, setPhase] = useState<DiscoveryPhase>('loading');
  const [context, setContext] = useState<DiscoveryContextV3 | null>(null);
  const [currentResult, setCurrentResult] = useState<NextScenesResult | null>(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locale, setLocaleState] = useState<Locale>('ru');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Ref so handlers don't need loadNextBatch as a dep (breaks cycles).
  const loadNextBatchRef = useRef<() => Promise<void>>(async () => {});

  const userGender: BodyGender =
    profile?.gender === 'female' ? 'female' : 'male';
  const partnerGender: BodyGender =
    profile?.interested_in === 'female' ? 'female' : 'male';

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  /**
   * Seed batch: if user has no positive main_question responses yet,
   * fetch is_onboarding=true main_question scenes as the first swipe group.
   * Falls back to priority-ordered main_questions if the flag is missing.
   */
  const fetchOnboardingSeedScenes = useCallback(
    async (
      userId: string,
      gender?: 'male' | 'female' | null,
    ): Promise<SceneV2Extended[]> => {
      // Scenes the user already answered — skip those.
      const { data: answered } = await supabase
        .from('scene_responses')
        .select('scene_slug')
        .eq('user_id', userId);

      const answeredSlugs = new Set(
        (answered || []).map((r) => r.scene_slug).filter(Boolean) as string[],
      );

      let query = supabase
        .from('scenes')
        .select('*')
        .eq('version', 2)
        .eq('is_active', true)
        .eq('is_onboarding', true)
        .eq('scene_type', 'main_question')
        .order('onboarding_order', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: true });

      if (gender) {
        query = query.or(`for_gender.eq.${gender},for_gender.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[Discover] fetchOnboardingSeedScenes error:', error);
        return [];
      }

      const scenes = (data || []) as SceneV2Extended[];
      return scenes.filter((s) => s.slug && !answeredSlugs.has(s.slug));
    },
    [supabase],
  );

  /** Derive phase from a NextScenesResult or a seeded main_question group. */
  const deriveSeedPhase = (scenes: SceneV2Extended[]): DiscoveryPhase => {
    if (scenes.length === 0) return 'completed';
    if (scenes.length > 1) return 'swipe_group';
    return 'single_scene';
  };

  const deriveResultPhase = (result: NextScenesResult): DiscoveryPhase => {
    if (result.scenes.length === 0) return 'completed';
    if (result.introSlide) return 'intro';
    if (result.scenes.length > 1) return 'swipe_group';
    return 'single_scene';
  };

  // --------------------------------------------------------------------------
  // Batch loading
  // --------------------------------------------------------------------------

  const loadNextBatch = useCallback(
    async (overrideContext?: DiscoveryContextV3) => {
      const ctx = overrideContext ?? context;
      if (!ctx) {
        setPhase('completed');
        return;
      }

      try {
        // Refresh context so shownClarifications / onboardingResponses are up to date.
        const freshCtx =
          (await buildDiscoveryContextV3(supabase, ctx.userId, ctx.locale)) ?? ctx;

        // If the user has zero positive main_question responses, seed with
        // onboarding main_questions first.
        const hasPositiveAnswers = Object.values(freshCtx.onboardingResponses).some(
          (v) => v === 1 || v === 2,
        );

        if (!hasPositiveAnswers) {
          const seedScenes = await fetchOnboardingSeedScenes(
            freshCtx.userId,
            freshCtx.userGender,
          );

          if (seedScenes.length > 0) {
            const seedResult: NextScenesResult = { scenes: seedScenes };
            setContext(freshCtx);
            setCurrentResult(seedResult);
            setCurrentSceneIndex(0);
            setPhase(deriveSeedPhase(seedScenes));
            return;
          }
        }

        const result = await getNextDiscoveryScenesV3(supabase, freshCtx);

        setContext(freshCtx);
        setCurrentResult(result);
        setCurrentSceneIndex(0);
        setPhase(deriveResultPhase(result));
      } catch (err) {
        console.error('[Discover] loadNextBatch error:', err);
        setErrorMessage(
          locale === 'ru'
            ? 'Не удалось загрузить следующие сцены'
            : 'Failed to load next scenes',
        );
        setPhase('error');
      }
    },
    [context, supabase, fetchOnboardingSeedScenes, locale],
  );

  loadNextBatchRef.current = () => loadNextBatch();

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  const initialize = useCallback(async () => {
    setPhase('loading');
    setErrorMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const effectiveProfile = (profileData as Profile) || null;
      setProfile(effectiveProfile);
      const effectiveLocale = getLocale(effectiveProfile);
      setLocaleState(effectiveLocale);

      const ctx = await buildDiscoveryContextV3(
        supabase,
        user.id,
        effectiveLocale,
      );
      if (!ctx) {
        setErrorMessage(
          effectiveLocale === 'ru'
            ? 'Профиль не найден. Заверши онбординг.'
            : 'Profile not found. Please complete onboarding.',
        );
        setPhase('error');
        return;
      }

      await loadNextBatch(ctx);
    } catch (err) {
      console.error('[Discover] initialize error:', err);
      setErrorMessage(
        locale === 'ru'
          ? 'Ошибка при загрузке'
          : 'Something went wrong while loading',
      );
      setPhase('error');
    }
  }, [supabase, router, loadNextBatch, locale]);

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleIntroContinue = useCallback(() => {
    if (!currentResult) return;
    if (currentResult.scenes.length === 0) {
      loadNextBatchRef.current();
    } else if (currentResult.scenes.length > 1) {
      setPhase('swipe_group');
    } else {
      setPhase('single_scene');
    }
  }, [currentResult]);

  const handleSwipeGroupComplete = useCallback(
    async (responses: SwipeCardResponse[]) => {
      if (!context || !currentResult) return;
      setSaving(true);
      try {
        const userId = context.userId;
        const triggeredByMain = currentResult.triggeredByMain || '';

        for (const response of responses) {
          const scene = currentResult.scenes.find(
            (s) => s.slug === response.sceneSlug,
          );
          if (!scene) continue;

          // Dedup tracking is only meaningful for clarification scenes that
          // had a triggering main_question. Skip for the onboarding seed.
          if (triggeredByMain) {
            try {
              await markClarificationShown(
                supabase,
                userId,
                scene.slug,
                triggeredByMain,
              );
            } catch (err) {
              console.error('[Discover] markClarificationShown failed:', err);
            }
          }

          await supabase.from('scene_responses').upsert(
            {
              user_id: userId,
              scene_id: scene.id,
              scene_slug: scene.slug,
              question_type: 'swipe',
              answer: { value: response.value },
              skipped: response.value === 0,
            },
            { onConflict: 'user_id,scene_id' },
          );

          // updateTagPreferencesFromSwipe handles value === 0 internally
          // (routes to markTagsAsRejected). Still guard on empty tags.
          if (scene.tags && scene.tags.length > 0) {
            try {
              await updateTagPreferencesFromSwipe(
                supabase,
                userId,
                scene.tags,
                scene.slug,
                response.value,
              );
            } catch (err) {
              console.error('[Discover] updateTagPreferencesFromSwipe failed:', err);
            }
          }
        }

        await loadNextBatch();
      } catch (err) {
        console.error('[Discover] handleSwipeGroupComplete error:', err);
        setErrorMessage(
          locale === 'ru'
            ? 'Не удалось сохранить ответы'
            : 'Failed to save responses',
        );
        setPhase('error');
      } finally {
        setSaving(false);
      }
    },
    [context, currentResult, supabase, loadNextBatch, locale],
  );

  const handleSingleSceneSubmit = useCallback(
    async (response: SceneV3Response) => {
      if (!context || !currentResult) return;
      const scene = currentResult.scenes[currentSceneIndex];
      if (!scene) return;

      setSaving(true);
      try {
        const userId = context.userId;
        const triggeredByMain = currentResult.triggeredByMain || '';

        if (triggeredByMain) {
          try {
            await markClarificationShown(
              supabase,
              userId,
              scene.slug,
              triggeredByMain,
            );
          } catch (err) {
            console.error('[Discover] markClarificationShown failed:', err);
          }
        }

        await supabase.from('scene_responses').upsert(
          {
            user_id: userId,
            scene_id: scene.id,
            scene_slug: scene.slug,
            question_type: response.type,
            answer: response,
            skipped: false,
          },
          { onConflict: 'user_id,scene_id' },
        );

        // Advance within the batch or fetch the next batch.
        if (currentSceneIndex < currentResult.scenes.length - 1) {
          setCurrentSceneIndex((prev) => prev + 1);
        } else {
          await loadNextBatch();
        }
      } catch (err) {
        console.error('[Discover] handleSingleSceneSubmit error:', err);
        setErrorMessage(
          locale === 'ru'
            ? 'Не удалось сохранить ответ'
            : 'Failed to save response',
        );
        setPhase('error');
      } finally {
        setSaving(false);
      }
    },
    [context, currentResult, currentSceneIndex, supabase, loadNextBatch, locale],
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (phase === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 text-center">
        <h1 className="text-xl font-semibold text-white mb-2">
          {t('somethingWentWrong', locale)}
        </h1>
        {errorMessage && (
          <p className="text-gray-400 mb-6 max-w-sm">{errorMessage}</p>
        )}
        <Button onClick={initialize} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('tryAgain', locale)}
        </Button>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          {t('discoveryDone', locale)}
        </h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          {t('discoveryComeBackLater', locale)}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => router.push('/profile')}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
          >
            {t('goToProfile', locale)}
          </Button>
          <Button onClick={initialize} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('checkForNew', locale)}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'intro' && currentResult?.introSlide) {
    return (
      <IntroSlideV3
        introSlide={currentResult.introSlide}
        locale={locale}
        onContinue={handleIntroContinue}
      />
    );
  }

  if (phase === 'swipe_group' && currentResult && currentResult.scenes.length > 0) {
    return (
      <SwipeCardsGroupV3
        scenes={currentResult.scenes}
        locale={locale}
        onComplete={handleSwipeGroupComplete}
        loading={saving}
      />
    );
  }

  if (
    phase === 'single_scene' &&
    currentResult &&
    currentResult.scenes[currentSceneIndex]
  ) {
    const scene = currentResult.scenes[currentSceneIndex];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
        <SceneRendererV3
          scene={scene}
          locale={locale}
          userGender={userGender}
          partnerGender={partnerGender}
          onSubmit={handleSingleSceneSubmit}
          loading={saving}
        />
      </div>
    );
  }

  // Fallback — shouldn't happen, but be visible rather than silent.
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 text-center">
      <p className="text-gray-400 mb-4">{t('somethingWentWrong', locale)}</p>
      <Button onClick={initialize} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('tryAgain', locale)}
      </Button>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type SwipeResponseValue } from '@/components/discovery/SwipeableSceneCard';
import { type ExperienceLevel } from '@/components/discovery/ExperienceSelector';
import { type SceneV3Response } from '@/components/discovery/SceneRendererV3';
import { getFilteredScenesClient } from '@/lib/scenes.client';
import {
  calculateSignalUpdates,
  calculateTestScoreUpdates,
  updatePsychologicalProfile,
} from '@/lib/profile-signals';
import { updateTagPreferencesFromSwipe } from '@/lib/tag-preferences';
import { processBodyMapToGatesAndTags } from '@/lib/body-map-processing';
import { getLocale } from '@/lib/locale';
import type {
  Scene,
  SceneV2,
  SceneV2Extended,
  Answer,
  Locale,
  Profile,
  BodyGender,
} from '@/lib/types';

// ─── Types ──────────────────────────────────────────────

export type DiscoveryStage = 'onboarding_intro' | 'onboarding' | 'onboarding_results' | 'body_map' | 'scenes';

export interface OnboardingResult {
  category: string;
  title: { ru: string; en: string };
  responseValue: SwipeResponseValue;
}

// ─── Hook ───────────────────────────────────────────────

export function useDiscovery() {
  // Core scene state
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Stage machine
  const [discoveryStage, setDiscoveryStage] = useState<DiscoveryStage>('onboarding_intro');
  const [bodyMapActivities, setBodyMapActivities] = useState<Scene[]>([]);
  const [currentBodyMapIndex, setCurrentBodyMapIndex] = useState(0);

  // Onboarding
  const [onboardingScenes, setOnboardingScenes] = useState<Scene[]>([]);
  const [currentOnboardingIndex, setCurrentOnboardingIndex] = useState(0);
  const [onboardingResults, setOnboardingResults] = useState<OnboardingResult[]>([]);

  // User
  const [locale, setLocale] = useState<Locale>('ru');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Body map config
  const [bodyMapConfigs, setBodyMapConfigs] = useState<Record<string, any>>({});
  const [bodyMapMainQuestions, setBodyMapMainQuestions] = useState<Record<string, any>>({});

  // Experience selector
  const [experience, setExperience] = useState<ExperienceLevel>(null);

  const supabase = createClient();

  // ─── Derived state ──────────────────────────────────

  const currentScene = discoveryStage === 'onboarding'
    ? onboardingScenes[currentOnboardingIndex]
    : discoveryStage === 'body_map'
      ? bodyMapActivities[currentBodyMapIndex]
      : scenes[currentIndex];

  const currentSceneExtended = currentScene as unknown as SceneV2Extended;
  const sceneType = currentSceneExtended?.scene_type;
  const isSpecialSceneType = sceneType != null;
  const isBodyMapScene = currentScene?.question_type === 'body_map';

  const userGender: BodyGender = userProfile?.gender === 'female' ? 'female' : 'male';
  const partnerGender: BodyGender = userProfile?.interested_in === 'female' ? 'female' : 'male';

  // Body map gender
  let bodyGenderForMap: BodyGender = 'male';
  if (currentScene?.slug === 'bodymap-self') {
    bodyGenderForMap = userProfile?.gender === 'female' ? 'female' : 'male';
  } else if (currentScene?.slug === 'bodymap-partner-female') {
    bodyGenderForMap = 'female';
  } else if (currentScene?.slug === 'bodymap-partner-male') {
    bodyGenderForMap = 'male';
  }

  const bodyMapConfig = currentScene ? bodyMapConfigs[currentScene.id] : null;
  const bodyMapMainQuestion = currentScene ? bodyMapMainQuestions[currentScene.id] : null;

  // ─── Data fetching ──────────────────────────────────

  // Locale from profile
  useEffect(() => {
    if (userProfile) {
      setLocale(getLocale(userProfile));
    } else {
      setLocale(getLocale());
    }
  }, [userProfile]);

  // Check Body Map status
  const checkBodyMapStatus = useCallback(async (userId: string): Promise<'completed' | 'skipped' | 'pending'> => {
    const { data: flowState } = await supabase
      .from('user_flow_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (flowState?.tag_scores && (flowState.tag_scores as any).body_map_skipped === true) {
      return 'skipped';
    }

    const { data: sceneResponses } = await supabase
      .from('scene_responses')
      .select('scene_id, question_type')
      .eq('user_id', userId)
      .or('question_type.eq.body_map,scene_id.like.bodymap-%');

    const { data: bodyMapResponses } = await supabase
      .from('body_map_responses')
      .select('activity_id, pass')
      .eq('user_id', userId);

    const answeredBodyMaps = new Set<string>();

    sceneResponses?.forEach(r => {
      if (r.scene_id && (r.scene_id.includes('bodymap') || r.question_type === 'body_map')) {
        answeredBodyMaps.add(r.scene_id);
      }
    });

    bodyMapResponses?.forEach(r => {
      if (r.activity_id) {
        answeredBodyMaps.add(r.activity_id);
      }
    });

    if (answeredBodyMaps.size >= 1) {
      return 'completed';
    }

    return 'pending';
  }, [supabase]);

  // Fetch Body Map activities
  const fetchBodyMapActivities = useCallback(async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('gender, interested_in')
      .eq('id', user.id)
      .single();

    if (!profile) return [];

    const interestedIn = profile.interested_in || 'female';

    const virtualScenes: Scene[] = [];

    // Self body map
    virtualScenes.push({
      id: `bodymap-self-${user.id}`,
      slug: 'bodymap-self',
      version: 2,
      category: 'body_map',
      priority: 1,
      image_url: null,
      created_at: new Date().toISOString(),
      title: { ru: 'Твоё тело', en: 'Your body' },
      subtitle: { ru: 'Отметь зоны и действия для себя', en: 'Mark zones and actions for yourself' },
      user_description: {
        ru: 'Отметь на своём теле зоны и выбери действия, которые тебе нравятся или не нравятся',
        en: 'Mark zones on your body and select actions you like or dislike'
      },
      ai_description: { ru: 'Интерактивная карта тела пользователя', en: 'Interactive body map for user' },
      question_type: 'body_map',
      intensity: 1,
      tags: ['body_map', 'self'],
      dimensions: [],
      ai_context: {
        action: 'universal',
        passes: [{ id: 'receive', question: { ru: 'Где тебе нравится или не нравится, когда партнёр(ша) тебя касается?', en: 'Where do you like or dislike your partner touching you?' } }],
        zones: { available: ['lips', 'ears', 'neck', 'shoulders', 'chest', 'breasts', 'nipples', 'stomach', 'back', 'lower_back', 'arms', 'hands', 'buttocks', 'anus', 'groin', 'penis', 'vulva', 'thighs', 'feet'] },
      },
    } as Scene);

    // Partner body maps
    if (interestedIn === 'female' || interestedIn === 'both') {
      virtualScenes.push({
        id: `bodymap-partner-female-${user.id}`,
        slug: 'bodymap-partner-female',
        version: 2,
        category: 'body_map',
        priority: 2,
        image_url: null,
        created_at: new Date().toISOString(),
        title: { ru: 'Тело партнёрши', en: "Partner's body (female)" },
        subtitle: { ru: 'Отметь зоны и действия для партнёрши', en: 'Mark zones and actions for female partner' },
        user_description: { ru: 'Отметь на теле партнёрши зоны и выбери действия', en: 'Mark zones on female partner body' },
        ai_description: { ru: 'Интерактивная карта тела партнёрши', en: 'Interactive body map for female partner' },
        question_type: 'body_map',
        intensity: 1,
        tags: ['body_map', 'partner', 'female'],
        dimensions: [],
        ai_context: {
          action: 'universal',
          passes: [{ id: 'give', question: { ru: 'Где ты любишь или не любишь касаться партнёрши?', en: 'Where do you like or dislike touching your partner?' } }],
          zones: { available: ['lips', 'ears', 'neck', 'shoulders', 'chest', 'breasts', 'nipples', 'stomach', 'back', 'lower_back', 'arms', 'hands', 'buttocks', 'anus', 'groin', 'vulva', 'thighs', 'feet'] },
        },
      } as Scene);
    }

    if (interestedIn === 'male' || interestedIn === 'both') {
      virtualScenes.push({
        id: `bodymap-partner-male-${user.id}`,
        slug: 'bodymap-partner-male',
        version: 2,
        category: 'body_map',
        priority: interestedIn === 'both' ? 3 : 2,
        image_url: null,
        created_at: new Date().toISOString(),
        title: { ru: 'Тело партнёра', en: "Partner's body (male)" },
        subtitle: { ru: 'Отметь зоны и действия для партнёра', en: 'Mark zones and actions for male partner' },
        user_description: { ru: 'Отметь на теле партнёра зоны и выбери действия', en: 'Mark zones on male partner body' },
        ai_description: { ru: 'Интерактивная карта тела партнёра', en: 'Interactive body map for male partner' },
        question_type: 'body_map',
        intensity: 1,
        tags: ['body_map', 'partner', 'male'],
        dimensions: [],
        ai_context: {
          action: 'universal',
          passes: [{ id: 'give', question: { ru: 'Где ты любишь или не любишь касаться партнёра?', en: 'Where do you like or dislike touching your partner?' } }],
          zones: { available: ['lips', 'ears', 'neck', 'shoulders', 'chest', 'nipples', 'stomach', 'back', 'lower_back', 'arms', 'hands', 'buttocks', 'anus', 'groin', 'penis', 'thighs', 'feet'] },
        },
      } as Scene);
    }

    setBodyMapActivities(virtualScenes);
    setCurrentBodyMapIndex(0);
    return virtualScenes;
  }, [supabase]);

  // Fetch regular scenes
  const fetchRegularScenes = useCallback(async (userId: string, gender?: 'male' | 'female') => {
    try {
      const scenesData = await getFilteredScenesClient(supabase, userId, {
        limit: 20,
        orderByPriority: false,
        enableAdaptiveFlow: true,
        enableDedupe: true,
        userGender: gender,
      });

      if (scenesData.length === 0) {
        const fallbackScenes = await getFilteredScenesClient(supabase, userId, {
          limit: 20,
          orderByPriority: true,
          enableAdaptiveFlow: false,
          enableDedupe: true,
          userGender: gender,
        });
        setScenes(fallbackScenes);
        setCurrentIndex(0);
        return fallbackScenes;
      }

      setScenes(scenesData);
      setCurrentIndex(0);
      return scenesData;
    } catch (error) {
      console.error('[Discover] Error fetching scenes:', error);
      return [];
    }
  }, [supabase]);

  // Fetch onboarding scenes
  const fetchOnboardingScenes = useCallback(async (userId: string, gender?: 'male' | 'female') => {
    try {
      const { data: answered } = await supabase
        .from('scene_responses')
        .select('scene_id')
        .eq('user_id', userId);

      const answeredIds = new Set(answered?.map(r => r.scene_id) || []);

      let query = supabase
        .from('scenes')
        .select('*')
        .eq('is_onboarding', true)
        .eq('is_active', true)
        .order('onboarding_order', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: true });

      if (gender) {
        query = query.or(`for_gender.eq.${gender},for_gender.is.null`);
      }

      const { data: onboardingScenesData, error } = await query;

      if (error) {
        console.error('[Discover] Error fetching onboarding scenes:', error);
        return [];
      }

      const unanswered = (onboardingScenesData || []).filter(s => !answeredIds.has(s.id));

      setOnboardingScenes(unanswered);
      setCurrentOnboardingIndex(0);
      return unanswered;
    } catch (error) {
      console.error('[Discover] Error fetching onboarding scenes:', error);
      return [];
    }
  }, [supabase]);

  // Main orchestrator
  const fetchScenes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile as Profile);
        setLocale(getLocale(profile as Profile));
      }

      const { data: answered } = await supabase
        .from('scene_responses')
        .select('scene_id')
        .eq('user_id', user.id);

      setAnsweredCount(answered?.length || 0);

      const visualOnboardingCompleted = (profile as any)?.visual_onboarding_completed === true;

      if (!visualOnboardingCompleted) {
        const gender = profile?.gender as 'male' | 'female' | undefined;
        const onboardingScenesData = await fetchOnboardingScenes(user.id, gender);

        if (onboardingScenesData.length > 0) {
          setDiscoveryStage('onboarding_intro');
        } else {
          await supabase
            .from('profiles')
            .update({ visual_onboarding_completed: true })
            .eq('id', user.id);

          const bodyMapStatus = await checkBodyMapStatus(user.id);
          if (bodyMapStatus === 'pending') {
            setDiscoveryStage('body_map');
            await fetchBodyMapActivities(user.id);
          } else {
            setDiscoveryStage('scenes');
            await fetchRegularScenes(user.id, gender);
          }
        }
      } else {
        const bodyMapStatus = await checkBodyMapStatus(user.id);

        if (bodyMapStatus === 'pending') {
          setDiscoveryStage('body_map');
          await fetchBodyMapActivities(user.id);
        } else {
          setDiscoveryStage('scenes');
          const gender = profile?.gender as 'male' | 'female' | undefined;
          await fetchRegularScenes(user.id, gender);
        }
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, checkBodyMapStatus, fetchBodyMapActivities, fetchRegularScenes, fetchOnboardingScenes]);

  // Initial fetch
  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  // Body map config computation
  useEffect(() => {
    if (currentScene?.question_type === 'body_map') {
      const aiContext = (currentScene as any).ai_context || {};
      const passes = (aiContext.passes || []).map((p: any) => ({
        subject: p.id === 'give' || p.id === 'receive' ? p.id : (p.subject || 'give'),
        question: p.question || { ru: '', en: '' },
      }));

      const zones = aiContext.zones;
      const availableZones = (zones && typeof zones === 'object' && 'available' in zones)
        ? zones.available
        : ['lips', 'ears', 'neck', 'shoulders', 'chest', 'breasts', 'nipples', 'stomach', 'back', 'lower_back', 'arms', 'hands', 'buttocks', 'anus', 'groin', 'penis', 'vulva', 'thighs', 'feet'];

      const config = {
        action: aiContext.action || 'universal',
        passes: passes.length > 0 ? passes : [{
          subject: currentScene.slug === 'bodymap-self' ? 'receive' : 'give',
          question: {
            ru: currentScene.slug === 'bodymap-self'
              ? 'Где тебе нравится или не нравится, когда партнёр(ша) тебя касается?'
              : 'Где ты любишь или не любишь касаться партнёра?',
            en: currentScene.slug === 'bodymap-self'
              ? 'Where do you like or dislike your partner touching you?'
              : 'Where do you like or dislike touching your partner?',
          },
        }],
        availableZones,
      };

      setBodyMapConfigs(prev => ({ ...prev, [currentScene.id]: config }));

      const firstPass = config.passes[0];
      setBodyMapMainQuestions(prev => ({ ...prev, [currentScene.id]: firstPass.question }));
    }
  }, [currentScene]);

  // ─── Handlers ───────────────────────────────────────

  const moveToNextScene = useCallback(async () => {
    if (discoveryStage === 'onboarding') {
      if (currentOnboardingIndex < onboardingScenes.length - 1) {
        setCurrentOnboardingIndex(prev => prev + 1);
      } else {
        setDiscoveryStage('onboarding_results');
      }
    } else if (discoveryStage === 'body_map') {
      if (currentBodyMapIndex < bodyMapActivities.length - 1) {
        setCurrentBodyMapIndex(prev => prev + 1);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setDiscoveryStage('scenes');
          await fetchRegularScenes(user.id, userProfile?.gender as 'male' | 'female' | undefined);
        }
      }
    } else {
      setAnsweredCount(prev => prev + 1);
      if (currentIndex < scenes.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        await fetchScenes();
      }
    }
  }, [discoveryStage, currentIndex, scenes.length, currentBodyMapIndex, bodyMapActivities.length, currentOnboardingIndex, onboardingScenes.length, fetchScenes, fetchRegularScenes, supabase, userProfile?.gender]);

  const skipBodyMap = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: flowState } = await supabase
      .from('user_flow_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const tagScores = flowState?.tag_scores || {};
    (tagScores as any).body_map_skipped = true;

    if (flowState) {
      await supabase.from('user_flow_state').update({ tag_scores: tagScores }).eq('user_id', user.id);
    } else {
      await supabase.from('user_flow_state').insert({ user_id: user.id, tag_scores: tagScores });
    }

    setDiscoveryStage('scenes');
    await fetchRegularScenes(user.id, userProfile?.gender as 'male' | 'female' | undefined);
  }, [fetchRegularScenes, supabase, userProfile?.gender]);

  const startOnboarding = useCallback(() => {
    setDiscoveryStage('onboarding');
  }, []);

  const finishOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ visual_onboarding_completed: true })
        .eq('id', user.id);

      const bodyMapStatus = await checkBodyMapStatus(user.id);

      if (bodyMapStatus === 'pending') {
        setDiscoveryStage('body_map');
        await fetchBodyMapActivities(user.id);
      } else {
        setDiscoveryStage('scenes');
        await fetchRegularScenes(user.id, userProfile?.gender as 'male' | 'female' | undefined);
      }
    } catch (error) {
      console.error('Error finishing onboarding:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, checkBodyMapStatus, fetchBodyMapActivities, fetchRegularScenes, userProfile?.gender]);

  const handleSwipeResponse = useCallback(async (value: SwipeResponseValue) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sceneV2 = currentScene as unknown as SceneV2;

      await supabase.from('scene_responses').upsert({
        user_id: user.id,
        scene_id: currentScene.id,
        scene_slug: sceneV2.slug || currentScene.id,
        question_type: 'swipe',
        answer: { value, experience },
        skipped: value === 0,
      }, { onConflict: 'user_id,scene_id' });

      if (sceneV2.tags && sceneV2.tags.length > 0) {
        try {
          await updateTagPreferencesFromSwipe(
            supabase,
            user.id,
            sceneV2.tags,
            sceneV2.slug || sceneV2.id,
            value,
            experience
          );
        } catch (err) {
          console.error('Failed to update tag preferences:', err);
        }
      }

      if (value > 0 && sceneV2.version === 2) {
        try {
          const answer = { value };
          const signalUpdates = calculateSignalUpdates(answer, sceneV2);
          const testScoreUpdates = calculateTestScoreUpdates(answer, sceneV2);

          if (signalUpdates.length > 0 || Object.keys(testScoreUpdates).length > 0) {
            await updatePsychologicalProfile(supabase, user.id, signalUpdates, testScoreUpdates, sceneV2);
          }
        } catch (err) {
          console.error('Failed to update psychological profile:', err);
        }
      }

      setExperience(null);
      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting swipe:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, experience, supabase, moveToNextScene]);

  const handleOnboardingResponse = useCallback(async (value: SwipeResponseValue) => {
    const scene = onboardingScenes[currentOnboardingIndex];
    if (!scene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sceneV2 = scene as unknown as SceneV2;

      await supabase.from('scene_responses').upsert({
        user_id: user.id,
        scene_id: scene.id,
        scene_slug: sceneV2.slug || scene.id,
        question_type: 'swipe',
        answer: { value },
        skipped: value === 0,
      }, { onConflict: 'user_id,scene_id' });

      if (value > 0) {
        setOnboardingResults(prev => [...prev, {
          category: sceneV2.category || 'general',
          title: scene.title || { ru: '', en: '' },
          responseValue: value,
        }]);
      }

      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting onboarding response:', error);
    } finally {
      setSubmitting(false);
    }
  }, [onboardingScenes, currentOnboardingIndex, supabase, moveToNextScene]);

  const handleBodyMapSubmit = useCallback(async (answer: Answer) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bodyMapAnswer = answer as any;
      const activityId = currentScene.slug || currentScene.id;

      for (const pass of bodyMapAnswer.passes) {
        const zones: string[] = [];
        if (pass.zoneActionPreferences) {
          for (const [zoneId, actions] of Object.entries(pass.zoneActionPreferences)) {
            const actionPrefs = actions as Record<string, any>;
            const hasPreferences = Object.values(actionPrefs).some(pref => pref !== null && pref !== undefined);
            if (hasPreferences) zones.push(zoneId);
          }
        }

        if (zones.length > 0) {
          await supabase.from('body_map_responses').upsert({
            user_id: user.id,
            activity_id: activityId,
            pass: pass.subject,
            zones_selected: zones,
          }, { onConflict: 'user_id,activity_id,pass' });
        }
      }

      const { data: prefProfile } = await supabase
        .from('preference_profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const preferences = prefProfile?.preferences || {};
      if (!preferences.body_map) preferences.body_map = {};

      const bodyMapPrefs = preferences.body_map as Record<string, any>;
      const sceneSlug = currentScene.slug || currentScene.id;

      bodyMapPrefs[sceneSlug] = {
        zoneActionPreferences: bodyMapAnswer.passes.map((pass: any) => ({
          subject: pass.subject,
          gender: pass.gender,
          zoneActionPreferences: pass.zoneActionPreferences || {},
        })),
        updatedAt: new Date().toISOString(),
      };

      await supabase.from('preference_profiles').upsert({
        user_id: user.id,
        preferences,
      }, { onConflict: 'user_id' });

      try {
        await processBodyMapToGatesAndTags(supabase, user.id, bodyMapAnswer, sceneSlug);
      } catch (err) {
        console.error('Error processing body map:', err);
      }

      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting body map:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, supabase, moveToNextScene]);

  const handleV3Response = useCallback(async (response: SceneV3Response) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let answer: Answer;
      if (response.type === 'multi_choice_text') {
        const selected = response.customValue
          ? [...response.selected, `custom:${response.customValue}`]
          : response.selected;
        answer = { selected };
      } else if (response.type === 'image_selection') {
        answer = { selected: response.selected };
      } else if (response.type === 'scale_text') {
        answer = { value: response.value };
      } else if (response.type === 'paired_text') {
        answer = { value: Math.round((response.answers.give + response.answers.receive) / 2) };
      } else if (response.type === 'body_map_activity') {
        answer = response.answer;
      } else {
        answer = { value: 0 };
      }

      await supabase.from('scene_responses').upsert({
        user_id: user.id,
        scene_id: currentScene.id,
        scene_slug: (currentScene as any).slug || currentScene.id,
        question_type: response.type,
        answer,
      }, { onConflict: 'user_id,scene_id' });

      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting V3 response:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, supabase, moveToNextScene]);

  const refreshScenes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await fetchRegularScenes(user.id, userProfile?.gender as 'male' | 'female' | undefined);
  }, [supabase, fetchRegularScenes, userProfile?.gender]);

  // ─── Return ─────────────────────────────────────────

  return {
    // Stage & loading
    stage: discoveryStage,
    loading,
    submitting,
    locale,

    // Current scene
    currentScene,
    currentSceneExtended,
    isBodyMapScene,
    isSpecialSceneType,

    // Onboarding
    onboardingScenes,
    currentOnboardingIndex,
    onboardingResults,
    startOnboarding,
    finishOnboarding,
    handleOnboardingResponse,

    // Body map
    bodyMapActivities,
    currentBodyMapIndex,
    bodyMapConfig,
    bodyMapMainQuestion,
    bodyGenderForMap,
    skipBodyMap,
    handleBodyMapSubmit,

    // Discovery scenes
    scenes,
    answeredCount,
    handleSwipeResponse,
    handleV3Response,
    experience,
    setExperience,
    refreshScenes,

    // User
    userProfile,
    userGender,
    partnerGender,

    // Navigation
    moveToNextScene,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SwipeableSceneCard, type SwipeResponseValue } from '@/components/discovery/SwipeableSceneCard';
import { type ExperienceLevel } from '@/components/discovery/ExperienceSelector';
import { BodyMapAnswer } from '@/components/discovery/BodyMapAnswer';
import { SceneRendererV3, type SceneV3Response } from '@/components/discovery/SceneRendererV3';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { getFilteredScenesClient } from '@/lib/scenes.client';
import {
  calculateSignalUpdates,
  calculateTestScoreUpdates,
  updatePsychologicalProfile,
} from '@/lib/profile-signals';
import { updateTagPreferencesFromSwipe } from '@/lib/tag-preferences';
import { processBodyMapToGatesAndTags } from '@/lib/body-map-processing';
import { getLocale, t } from '@/lib/locale';
import type {
  Scene,
  SceneV2,
  SceneV2Extended,
  Answer,
  Locale,
  Profile,
  BodyGender,
} from '@/lib/types';

type DiscoveryStage = 'onboarding_intro' | 'onboarding' | 'onboarding_results' | 'body_map' | 'scenes';

interface OnboardingResult {
  category: string;
  title: { ru: string; en: string };
  responseValue: SwipeResponseValue;
}

export default function DiscoverPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Discovery stage: onboarding_intro → onboarding → onboarding_results → body_map → scenes
  const [discoveryStage, setDiscoveryStage] = useState<DiscoveryStage>('onboarding_intro');
  const [bodyMapActivities, setBodyMapActivities] = useState<Scene[]>([]);
  const [currentBodyMapIndex, setCurrentBodyMapIndex] = useState(0);

  // Onboarding state
  const [onboardingScenes, setOnboardingScenes] = useState<Scene[]>([]);
  const [currentOnboardingIndex, setCurrentOnboardingIndex] = useState(0);
  const [onboardingResults, setOnboardingResults] = useState<OnboardingResult[]>([]);

  const [locale, setLocale] = useState<Locale>('ru');

  // User profile state
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  // Body map config storage
  const [bodyMapConfigs, setBodyMapConfigs] = useState<Record<string, any>>({});
  const [bodyMapMainQuestions, setBodyMapMainQuestions] = useState<Record<string, any>>({});

  // Experience selector state (reset on scene change)
  const [experience, setExperience] = useState<ExperienceLevel>(null);

  const supabase = createClient();

  // Get current scene based on stage
  const currentScene = discoveryStage === 'onboarding'
    ? onboardingScenes[currentOnboardingIndex]
    : discoveryStage === 'body_map'
      ? bodyMapActivities[currentBodyMapIndex]
      : scenes[currentIndex];

  // Check if current scene needs special rendering (has scene_type set)
  const currentSceneExtended = currentScene as unknown as SceneV2Extended;
  const sceneType = currentSceneExtended?.scene_type;
  const isSpecialSceneType = sceneType != null;
  const isBodyMapScene = currentScene?.question_type === 'body_map';

  // Get user gender for components
  const userGender: BodyGender = userProfile?.gender === 'female' ? 'female' : 'male';
  const partnerGender: BodyGender = userProfile?.interested_in === 'female' ? 'female' : 'male';

  // Initialize locale from profile
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
      // Get already answered scenes (unified table)
      const { data: answered } = await supabase
        .from('scene_responses')
        .select('scene_id')
        .eq('user_id', userId);

      const answeredIds = new Set(answered?.map(r => r.scene_id) || []);

      // Fetch onboarding scenes using is_onboarding flag
      let query = supabase
        .from('scenes')
        .select('*')
        .eq('is_onboarding', true)
        .eq('is_active', true)
        .order('onboarding_order', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: true });

      // Filter by for_gender
      if (gender) {
        query = query.or(`for_gender.eq.${gender},for_gender.is.null`);
      }

      const { data: onboardingScenesData, error } = await query;

      if (error) {
        console.error('[Discover] Error fetching onboarding scenes:', error);
        return [];
      }

      // Filter out already answered scenes
      const unanswered = (onboardingScenesData || []).filter(s => !answeredIds.has(s.id));

      setOnboardingScenes(unanswered);
      setCurrentOnboardingIndex(0);
      return unanswered;
    } catch (error) {
      console.error('[Discover] Error fetching onboarding scenes:', error);
      return [];
    }
  }, [supabase]);

  // Main fetch function
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

      // Check if visual onboarding is completed
      const visualOnboardingCompleted = (profile as any)?.visual_onboarding_completed === true;

      if (!visualOnboardingCompleted) {
        // Start onboarding flow
        const gender = profile?.gender as 'male' | 'female' | undefined;
        const onboardingScenesData = await fetchOnboardingScenes(user.id, gender);

        if (onboardingScenesData.length > 0) {
          setDiscoveryStage('onboarding_intro');
        } else {
          // All onboarding scenes answered, mark as completed and continue
          await supabase
            .from('profiles')
            .update({ visual_onboarding_completed: true })
            .eq('id', user.id);

          // Continue to body map or scenes
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
      } else {
        // Visual onboarding completed, continue normal flow
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
  }, [supabase, checkBodyMapStatus, fetchBodyMapActivities, fetchRegularScenes]);

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  // Setup body map config when scene changes
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

  // Move to next scene
  const moveToNextScene = useCallback(async () => {
    if (discoveryStage === 'onboarding') {
      if (currentOnboardingIndex < onboardingScenes.length - 1) {
        setCurrentOnboardingIndex(prev => prev + 1);
      } else {
        // Onboarding complete - show results
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

  // Skip body map
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

  // Handle swipe response for regular scenes
  const handleSwipeResponse = async (value: SwipeResponseValue) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sceneV2 = currentScene as unknown as SceneV2;

      // Save response (including experience if selected)
      await supabase.from('scene_responses').upsert({
        user_id: user.id,
        scene_id: currentScene.id,
        scene_slug: sceneV2.slug || currentScene.id,
        question_type: 'swipe',
        answer: { value, experience },
        skipped: value === 0,
      }, { onConflict: 'user_id,scene_id' });

      // Update tag preferences using scene.tags (V3 style)
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

      // Update psychological profile signals if interested (value > 0)
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

      // Reset experience for next scene
      setExperience(null);

      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting swipe:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle onboarding response (saves to scene_responses - unified table)
  const handleOnboardingResponse = async (value: SwipeResponseValue) => {
    const scene = onboardingScenes[currentOnboardingIndex];
    if (!scene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sceneV2 = scene as unknown as SceneV2;

      // Save to scene_responses (unified table for all scenes)
      // Gate is computed by DB trigger from sets_gate
      await supabase.from('scene_responses').upsert({
        user_id: user.id,
        scene_id: scene.id,
        scene_slug: sceneV2.slug || scene.id,
        question_type: 'swipe',
        answer: { value },
        skipped: value === 0,
      }, { onConflict: 'user_id,scene_id' });

      // Track results for display
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
  };

  // Finish onboarding and continue to body map or scenes
  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark onboarding as completed
      await supabase
        .from('profiles')
        .update({ visual_onboarding_completed: true })
        .eq('id', user.id);

      // Continue to body map or scenes
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
  };

  // Handle body map response
  const handleBodyMapSubmit = async (answer: Answer) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bodyMapAnswer = answer as any;
      const activityId = currentScene.slug || currentScene.id;

      // Save to body_map_responses
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

      // Update preference profile
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

      // Process gates and tags
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
  };

  // Handle V3 scene response
  const handleV3Response = async (response: SceneV3Response) => {
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
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Empty state for scenes
  if (discoveryStage === 'scenes' && scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <p className="text-muted-foreground mb-4">{t('allScenesAnswered', locale)}</p>
        <Button
          onClick={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await fetchRegularScenes(user.id, userProfile?.gender as 'male' | 'female' | undefined);
          }}
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('checkForNew', locale)}
        </Button>
      </div>
    );
  }

  // Empty state for body map
  if (discoveryStage === 'body_map' && bodyMapActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <p className="text-muted-foreground mb-4">
          {locale === 'ru' ? 'Body Map не найден' : 'Body Map not found'}
        </p>
        <Button onClick={skipBodyMap} variant="outline">
          {locale === 'ru' ? 'Перейти к сценам' : 'Go to scenes'}
        </Button>
      </div>
    );
  }

  // Empty state for onboarding (shouldn't happen, but just in case)
  if (discoveryStage === 'onboarding' && onboardingScenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <p className="text-muted-foreground mb-4">
          {locale === 'ru' ? 'Загрузка...' : 'Loading...'}
        </p>
        <Button onClick={finishOnboarding} variant="outline">
          {locale === 'ru' ? 'Продолжить' : 'Continue'}
        </Button>
      </div>
    );
  }

  // Get body map config for current scene
  const bodyMapConfig = currentScene ? bodyMapConfigs[currentScene.id] : null;
  const bodyMapMainQuestion = currentScene ? bodyMapMainQuestions[currentScene.id] : null;

  // Determine body gender for body map
  let bodyGenderForMap: BodyGender = 'male';
  if (currentScene?.slug === 'bodymap-self') {
    bodyGenderForMap = userProfile?.gender === 'female' ? 'female' : 'male';
  } else if (currentScene?.slug === 'bodymap-partner-female') {
    bodyGenderForMap = 'female';
  } else if (currentScene?.slug === 'bodymap-partner-male') {
    bodyGenderForMap = 'male';
  }

  // Start onboarding from intro screen
  const startOnboarding = () => {
    setDiscoveryStage('onboarding');
  };

  // Onboarding intro screen
  if (discoveryStage === 'onboarding_intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm space-y-6"
        >
          <h1 className="text-2xl font-bold">
            {locale === 'ru' ? 'Узнаём предпочтения' : 'Discovering preferences'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'ru'
              ? 'Мы покажем несколько категорий. Свайпай, чтобы рассказать о своих интересах.'
              : "We'll show you some categories. Swipe to tell us about your interests."}
          </p>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col items-center p-3 rounded-lg bg-red-50">
              <span className="text-2xl text-red-500">←</span>
              <span className="text-sm text-red-600 font-medium">
                {locale === 'ru' ? 'Нет' : 'No'}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-green-50">
              <span className="text-2xl text-green-500">→</span>
              <span className="text-sm text-green-600 font-medium">
                {locale === 'ru' ? 'Да' : 'Yes'}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-pink-50">
              <span className="text-2xl text-pink-500">↑</span>
              <span className="text-sm text-pink-600 font-medium">
                {locale === 'ru' ? 'Очень!' : 'Love it!'}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-amber-50">
              <span className="text-2xl text-amber-500">↓</span>
              <span className="text-sm text-amber-600 font-medium">
                {locale === 'ru' ? 'Если попросит' : 'If asked'}
              </span>
            </div>
          </div>

          <Button onClick={startOnboarding} size="lg" className="w-full">
            {locale === 'ru' ? 'Начать' : 'Start'}
          </Button>

          <p className="text-xs text-muted-foreground">
            {locale === 'ru'
              ? `${onboardingScenes.length} категорий`
              : `${onboardingScenes.length} categories`}
          </p>
        </motion.div>
      </div>
    );
  }

  // Onboarding results screen
  if (discoveryStage === 'onboarding_results') {
    const veryInterested = onboardingResults.filter(r => r.responseValue === 2);
    const interested = onboardingResults.filter(r => r.responseValue === 1);
    const ifAsked = onboardingResults.filter(r => r.responseValue === 3);

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full space-y-6"
        >
          <h1 className="text-2xl font-bold text-center">
            {locale === 'ru' ? 'Готово!' : 'Done!'}
          </h1>

          {onboardingResults.length > 0 ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                {locale === 'ru' ? 'Тебе может быть интересно:' : 'You might be interested in:'}
              </p>

              {veryInterested.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-pink-600">
                    🔥 {locale === 'ru' ? 'Сильный интерес' : 'Strong interest'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {veryInterested.map((r, i) => (
                      <span key={i} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                        {r.title[locale] || r.title.ru || r.title.en}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {interested.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">
                    ✓ {locale === 'ru' ? 'Интерес' : 'Interested'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {interested.map((r, i) => (
                      <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {r.title[locale] || r.title.ru || r.title.en}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ifAsked.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-600">
                    💬 {locale === 'ru' ? 'Если попросит партнёр' : 'If partner asks'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ifAsked.map((r, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                        {r.title[locale] || r.title.ru || r.title.en}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              {locale === 'ru'
                ? 'Теперь мы знаем немного больше о твоих предпочтениях'
                : 'Now we know a bit more about your preferences'}
            </p>
          )}

          <Button onClick={finishOnboarding} size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {locale === 'ru' ? 'Продолжить' : 'Continue'}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Progress indicator */}
      <div className="text-center text-sm text-muted-foreground">
        {discoveryStage === 'onboarding' ? (
          <span>
            {locale === 'ru'
              ? `Знакомство: ${currentOnboardingIndex + 1} из ${onboardingScenes.length}`
              : `Getting to know you: ${currentOnboardingIndex + 1} of ${onboardingScenes.length}`}
          </span>
        ) : discoveryStage === 'body_map' ? (
          <span>
            {locale === 'ru'
              ? `Body Map: ${currentBodyMapIndex + 1} из ${bodyMapActivities.length}`
              : `Body Map: ${currentBodyMapIndex + 1} of ${bodyMapActivities.length}`}
          </span>
        ) : (
          <span>{t('questionsAnswered', locale, { count: answeredCount })}</span>
        )}
      </div>

      {/* Skip Body Map button */}
      {discoveryStage === 'body_map' && (
        <div className="flex justify-end">
          <Button onClick={skipBodyMap} variant="ghost" size="sm" className="text-muted-foreground">
            {locale === 'ru' ? 'Пропустить Body Map' : 'Skip Body Map'}
          </Button>
        </div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">
        {/* Onboarding scenes */}
        {discoveryStage === 'onboarding' && onboardingScenes[currentOnboardingIndex] && (
          <motion.div
            key={`onboarding-${onboardingScenes[currentOnboardingIndex].id}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <SwipeableSceneCard
              scene={onboardingScenes[currentOnboardingIndex]}
              locale={locale}
              onResponse={handleOnboardingResponse}
              showExperienceSelector={false}
              loading={submitting}
            />
          </motion.div>
        )}

        {/* Regular scenes (body_map, scenes stages) */}
        {discoveryStage !== 'onboarding' && currentScene && (
          <motion.div
            key={currentScene.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            {/* Body Map */}
            {isBodyMapScene && bodyMapConfig && (
              <BodyMapAnswer
                key={`body-map-${currentScene.id}`}
                mainQuestion={bodyMapMainQuestion}
                config={bodyMapConfig}
                partnerGender={bodyGenderForMap}
                userGender={bodyGenderForMap}
                onSubmit={handleBodyMapSubmit}
                loading={submitting}
                locale={locale}
                zoneFirstMode={true}
              />
            )}

            {/* V3 Special Scene Types */}
            {!isBodyMapScene && isSpecialSceneType && currentSceneExtended && (
              <SceneRendererV3
                scene={currentSceneExtended}
                locale={locale}
                userGender={userGender}
                partnerGender={partnerGender}
                loading={submitting}
                onSubmit={handleV3Response}
              />
            )}

            {/* Regular Swipe Scene */}
            {!isBodyMapScene && !isSpecialSceneType && (
              <SwipeableSceneCard
                scene={currentScene}
                locale={locale}
                onResponse={handleSwipeResponse}
                experience={experience}
                onExperienceChange={setExperience}
                loading={submitting}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip onboarding button */}
      {discoveryStage === 'onboarding' && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={finishOnboarding}
            disabled={submitting}
            className="text-muted-foreground"
          >
            {locale === 'ru' ? 'Пропустить' : 'Skip'}
          </Button>
        </div>
      )}

      {/* Skip button (only for body map) */}
      {discoveryStage === 'body_map' && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={moveToNextScene}
            disabled={submitting}
          >
            {t('skip', locale)}
          </Button>
        </div>
      )}

    </div>
  );
}

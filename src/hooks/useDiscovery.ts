'use client';

import { useState, useEffect, useCallback } from 'react';
import { type SwipeResponseValue } from '@/components/discovery/SwipeableSceneCard';
import { type ExperienceLevel } from '@/components/discovery/ExperienceSelector';
import { type SceneV3Response } from '@/components/discovery/SceneRendererV3';
import { getFilteredScenesClient } from '@/lib/scenes.client';
import { fetchPendingProposals, updateProposalStatus } from '@/lib/proposals.client';
import { isSceneAllowed, type OnboardingGates } from '@/lib/onboarding-gates-pure';
import {
  calculateSignalUpdates,
  calculateTestScoreUpdates,
} from '@/lib/profile-signals-pure';
import { getLocale } from '@/lib/locale';
import type {
  Scene,
  SceneV2,
  SceneV2Extended,
  Answer,
  Locale,
  Profile,
  BodyGender,
  BodyMapSceneConfig,
  LocalizedString,
} from '@/lib/types';

// ─── Types ──────────────────────────────────────────────

export type DiscoveryStage = 'onboarding_intro' | 'onboarding' | 'onboarding_results' | 'body_map' | 'scenes';

export interface OnboardingResult {
  category: string;
  title: { ru: string; en: string };
  responseValue: SwipeResponseValue;
}

// ─── Helpers ────────────────────────────────────────────

interface DiscoveryState {
  profile: Profile | null;
  flowState: { tag_scores?: Record<string, unknown> | null } | null;
  sceneResponses: Array<{ scene_id: string | null; question_type: string | null }>;
  bodyMapResponses: Array<{ activity_id: string | null; pass: string | null }>;
  preferenceProfile: { preferences: Record<string, unknown> | null } | null;
}

async function fetchDiscoveryState(): Promise<DiscoveryState | null> {
  try {
    const res = await fetch('/api/discovery/state');
    if (!res.ok) return null;
    return (await res.json()) as DiscoveryState;
  } catch (err) {
    console.error('[useDiscovery] failed to fetch state:', err);
    return null;
  }
}

function deriveBodyMapStatus(
  state: DiscoveryState,
): 'completed' | 'skipped' | 'pending' {
  const tagScores = state.flowState?.tag_scores ?? {};
  if ((tagScores as Record<string, unknown>).body_map_skipped === true) {
    return 'skipped';
  }
  const answered = new Set<string>();
  for (const r of state.sceneResponses) {
    if (r.scene_id && (r.scene_id.includes('bodymap') || r.question_type === 'body_map')) {
      answered.add(r.scene_id);
    }
  }
  for (const r of state.bodyMapResponses) {
    if (r.activity_id) answered.add(r.activity_id);
  }
  return answered.size >= 1 ? 'completed' : 'pending';
}

async function saveSceneResponse(payload: {
  scene_id: string;
  scene_slug?: string | null;
  question_type?: string | null;
  answer?: unknown;
  skipped?: boolean;
}): Promise<void> {
  try {
    await fetch('/api/discovery/scene-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[useDiscovery] saveSceneResponse failed:', err);
  }
}

async function saveBodyMapResponse(payload: {
  activity_id: string;
  pass: string;
  zones_selected: string[];
}): Promise<void> {
  try {
    await fetch('/api/discovery/body-map-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[useDiscovery] saveBodyMapResponse failed:', err);
  }
}

async function savePreferenceProfile(preferences: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/discovery/preference-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    });
  } catch (err) {
    console.error('[useDiscovery] savePreferenceProfile failed:', err);
  }
}

async function setFlowState(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/discovery/flow-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[useDiscovery] setFlowState failed:', err);
  }
}

async function markVisualOnboardingComplete(): Promise<void> {
  try {
    await fetch('/api/discovery/onboarding-complete', { method: 'POST' });
  } catch (err) {
    console.error('[useDiscovery] markVisualOnboardingComplete failed:', err);
  }
}

async function fetchOnboardingScenesApi(gender?: 'male' | 'female'): Promise<Scene[]> {
  try {
    const url = gender
      ? `/api/discovery/onboarding-scenes?gender=${gender}`
      : '/api/discovery/onboarding-scenes';
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { scenes?: Scene[] };
    return json.scenes ?? [];
  } catch (err) {
    console.error('[useDiscovery] fetchOnboardingScenesApi failed:', err);
    return [];
  }
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
  const [bodyMapConfigs, setBodyMapConfigs] = useState<Record<string, BodyMapSceneConfig>>({});
  const [bodyMapMainQuestions, setBodyMapMainQuestions] = useState<Record<string, LocalizedString>>({});

  // Experience selector
  const [experience, setExperience] = useState<ExperienceLevel>(null);

  // Proposals tracking: scene_id → proposal_id
  const [proposalMap, setProposalMap] = useState<Map<string, string>>(new Map());

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

  const bodyMapConfig = currentScene ? bodyMapConfigs[currentScene.id] : undefined;
  const bodyMapMainQuestion = currentScene ? bodyMapMainQuestions[currentScene.id] : undefined;

  // ─── Data fetching ──────────────────────────────────

  // Locale from profile
  useEffect(() => {
    if (userProfile) {
      setLocale(getLocale(userProfile));
    } else {
      setLocale(getLocale());
    }
  }, [userProfile]);

  // Build virtual body-map "scenes" derived from profile
  const buildBodyMapActivities = useCallback((profile: Profile, userId: string) => {
    const interestedIn = profile.interested_in || 'female';
    const virtualScenes: Scene[] = [];

    virtualScenes.push({
      id: `bodymap-self-${userId}`,
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
        en: 'Mark zones on your body and select actions you like or dislike',
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

    if (interestedIn === 'female' || interestedIn === 'both') {
      virtualScenes.push({
        id: `bodymap-partner-female-${userId}`,
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
        id: `bodymap-partner-male-${userId}`,
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
  }, []);

  // Fetch regular scenes (with proposals injected)
  const fetchRegularScenes = useCallback(async (userId: string, gender?: 'male' | 'female') => {
    try {
      const proposedScenes: Scene[] = [];
      const newProposalMap = new Map<string, string>();

      try {
        const proposalsWithScenes = await fetchPendingProposals(null, userId);
        if (proposalsWithScenes.length > 0) {
          let gates: OnboardingGates = {};
          try {
            const res = await fetch('/api/user-gates');
            if (res.ok) {
              const json = await res.json();
              gates = (json.gates as OnboardingGates) ?? {};
            }
          } catch (err) {
            console.error('[Discover] Error fetching gates:', err);
          }

          for (const { proposal, scene } of proposalsWithScenes) {
            if (scene.slug && !isSceneAllowed(scene.slug, gates)) continue;

            const forGender = (scene as unknown as Record<string, unknown>).for_gender as string | undefined;
            if (forGender && gender && forGender !== gender) continue;

            proposedScenes.push(scene);
            newProposalMap.set(scene.id, proposal.id);

            await updateProposalStatus(null, proposal.id, 'shown');
          }
        }
      } catch (err) {
        console.error('[Discover] Error fetching proposals:', err);
      }

      const scenesData = await getFilteredScenesClient(null, userId, {
        limit: 20,
        orderByPriority: false,
        enableAdaptiveFlow: true,
        enableDedupe: true,
        userGender: gender,
      });

      const proposalSceneIds = new Set(proposedScenes.map((s) => s.id));
      const baseScenes = scenesData.length > 0
        ? scenesData
        : await getFilteredScenesClient(null, userId, {
            limit: 20,
            orderByPriority: true,
            enableAdaptiveFlow: false,
            enableDedupe: true,
            userGender: gender,
          });
      const deduped = baseScenes.filter((s) => !proposalSceneIds.has(s.id));

      const combined = [...proposedScenes, ...deduped];
      setScenes(combined);
      setProposalMap(newProposalMap);
      setCurrentIndex(0);
      return combined;
    } catch (error) {
      console.error('[Discover] Error fetching scenes:', error);
      return [];
    }
  }, []);

  // Main orchestrator — uses /api/discovery/state for the initial multi-table read
  const fetchScenes = useCallback(async () => {
    setLoading(true);
    try {
      const state = await fetchDiscoveryState();
      if (!state || !state.profile) return;

      const profile = state.profile;
      setUserProfile(profile);
      setLocale(getLocale(profile));
      setAnsweredCount(state.sceneResponses.length);

      const visualOnboardingCompleted = (profile as unknown as Record<string, unknown>).visual_onboarding_completed === true;
      const gender = profile.gender as 'male' | 'female' | undefined;

      if (!visualOnboardingCompleted) {
        const onboardingScenesData = await fetchOnboardingScenesApi(gender);
        setOnboardingScenes(onboardingScenesData);
        setCurrentOnboardingIndex(0);

        if (onboardingScenesData.length > 0) {
          setDiscoveryStage('onboarding_intro');
        } else {
          await markVisualOnboardingComplete();
          const bodyMapStatus = deriveBodyMapStatus(state);
          if (bodyMapStatus === 'pending') {
            setDiscoveryStage('body_map');
            buildBodyMapActivities(profile, profile.id);
          } else {
            setDiscoveryStage('scenes');
            await fetchRegularScenes(profile.id, gender);
          }
        }
      } else {
        const bodyMapStatus = deriveBodyMapStatus(state);
        if (bodyMapStatus === 'pending') {
          setDiscoveryStage('body_map');
          buildBodyMapActivities(profile, profile.id);
        } else {
          setDiscoveryStage('scenes');
          await fetchRegularScenes(profile.id, gender);
        }
      }
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setLoading(false);
    }
  }, [buildBodyMapActivities, fetchRegularScenes]);

  // Initial fetch
  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  // Body map config computation
  useEffect(() => {
    if (currentScene?.question_type === 'body_map') {
      const aiContext = (currentScene as unknown as Record<string, unknown>).ai_context as Record<string, unknown> | undefined ?? {};
      const passesRaw = (aiContext.passes as Array<Record<string, unknown>>) ?? [];
      const passes = passesRaw.map((p) => {
        const subject: 'give' | 'receive' =
          p.id === 'give' || p.id === 'receive'
            ? (p.id as 'give' | 'receive')
            : ((p.subject as 'give' | 'receive' | undefined) ?? 'give');
        const question = (p.question as LocalizedString | undefined) ?? { ru: '', en: '' };
        return { subject, question };
      });

      const zones = aiContext.zones as Record<string, unknown> | undefined;
      const availableZones = (zones && typeof zones === 'object' && 'available' in zones)
        ? (zones.available as string[])
        : ['lips', 'ears', 'neck', 'shoulders', 'chest', 'breasts', 'nipples', 'stomach', 'back', 'lower_back', 'arms', 'hands', 'buttocks', 'anus', 'groin', 'penis', 'vulva', 'thighs', 'feet'];

      const config: BodyMapSceneConfig = {
        action: (aiContext.action as BodyMapSceneConfig['action']) || 'universal',
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
        availableZones: availableZones as BodyMapSceneConfig['availableZones'],
      };

      setBodyMapConfigs((prev) => ({ ...prev, [currentScene.id]: config }));

      const firstPass = config.passes[0];
      setBodyMapMainQuestions((prev) => ({ ...prev, [currentScene.id]: firstPass.question }));
    }
  }, [currentScene]);

  // ─── Handlers ───────────────────────────────────────

  const moveToNextScene = useCallback(async () => {
    if (discoveryStage === 'onboarding') {
      if (currentOnboardingIndex < onboardingScenes.length - 1) {
        setCurrentOnboardingIndex((prev) => prev + 1);
      } else {
        setDiscoveryStage('onboarding_results');
      }
    } else if (discoveryStage === 'body_map') {
      if (currentBodyMapIndex < bodyMapActivities.length - 1) {
        setCurrentBodyMapIndex((prev) => prev + 1);
      } else if (userProfile) {
        setDiscoveryStage('scenes');
        await fetchRegularScenes(userProfile.id, userProfile.gender as 'male' | 'female' | undefined);
      }
    } else {
      setAnsweredCount((prev) => prev + 1);
      if (currentIndex < scenes.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await fetchScenes();
      }
    }
  }, [discoveryStage, currentIndex, scenes.length, currentBodyMapIndex, bodyMapActivities.length, currentOnboardingIndex, onboardingScenes.length, fetchScenes, fetchRegularScenes, userProfile]);

  const skipBodyMap = useCallback(async () => {
    if (!userProfile) return;
    await setFlowState({ body_map_skipped: true });
    setDiscoveryStage('scenes');
    await fetchRegularScenes(userProfile.id, userProfile.gender as 'male' | 'female' | undefined);
  }, [fetchRegularScenes, userProfile]);

  const startOnboarding = useCallback(() => {
    setDiscoveryStage('onboarding');
  }, []);

  const finishOnboarding = useCallback(async () => {
    setLoading(true);
    try {
      if (!userProfile) return;
      await markVisualOnboardingComplete();

      // Re-derive body-map status from a fresh state read
      const state = await fetchDiscoveryState();
      const bodyMapStatus = state ? deriveBodyMapStatus(state) : 'pending';

      if (bodyMapStatus === 'pending') {
        setDiscoveryStage('body_map');
        buildBodyMapActivities(userProfile, userProfile.id);
      } else {
        setDiscoveryStage('scenes');
        await fetchRegularScenes(userProfile.id, userProfile.gender as 'male' | 'female' | undefined);
      }
    } catch (error) {
      console.error('Error finishing onboarding:', error);
    } finally {
      setLoading(false);
    }
  }, [buildBodyMapActivities, fetchRegularScenes, userProfile]);

  const handleSwipeResponse = useCallback(async (value: SwipeResponseValue) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const sceneV2 = currentScene as unknown as SceneV2;

      await saveSceneResponse({
        scene_id: currentScene.id,
        scene_slug: sceneV2.slug || currentScene.id,
        question_type: 'swipe',
        answer: { value, experience },
        skipped: value === 0,
      });

      if (sceneV2.tags && sceneV2.tags.length > 0) {
        try {
          await fetch('/api/tag-preferences/swipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sceneTags: sceneV2.tags,
              sceneSlug: sceneV2.slug || sceneV2.id,
              responseValue: value,
              experienceLevel: experience,
            }),
          });
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
            await fetch('/api/profile-signals/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                signalUpdates,
                testScoreUpdates,
                scene: sceneV2,
              }),
            });
          }
        } catch (err) {
          console.error('Failed to update psychological profile:', err);
        }
      }

      const proposalId = proposalMap.get(currentScene.id);
      if (proposalId) {
        await updateProposalStatus(null, proposalId, 'answered');
      }

      setExperience(null);
      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting swipe:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, experience, moveToNextScene, proposalMap]);

  const handleOnboardingResponse = useCallback(async (value: SwipeResponseValue) => {
    const scene = onboardingScenes[currentOnboardingIndex];
    if (!scene) return;

    setSubmitting(true);
    try {
      const sceneV2 = scene as unknown as SceneV2;

      await saveSceneResponse({
        scene_id: scene.id,
        scene_slug: sceneV2.slug || scene.id,
        question_type: 'swipe',
        answer: { value },
        skipped: value === 0,
      });

      if (value > 0) {
        setOnboardingResults((prev) => [...prev, {
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
  }, [onboardingScenes, currentOnboardingIndex, moveToNextScene]);

  const handleBodyMapSubmit = useCallback(async (answer: Answer) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
      const bodyMapAnswer = answer as unknown as { passes: Array<{ subject: string; gender?: string; zoneActionPreferences?: Record<string, Record<string, unknown>> }> };
      const activityId = currentScene.slug || currentScene.id;

      for (const pass of bodyMapAnswer.passes) {
        const zones: string[] = [];
        if (pass.zoneActionPreferences) {
          for (const [zoneId, actions] of Object.entries(pass.zoneActionPreferences)) {
            const actionPrefs = actions as Record<string, unknown>;
            const hasPreferences = Object.values(actionPrefs).some((pref) => pref !== null && pref !== undefined);
            if (hasPreferences) zones.push(zoneId);
          }
        }

        if (zones.length > 0) {
          await saveBodyMapResponse({
            activity_id: activityId,
            pass: pass.subject,
            zones_selected: zones,
          });
        }
      }

      // Read existing preferences then merge
      let existingPreferences: Record<string, unknown> = {};
      try {
        const res = await fetch('/api/discovery/preference-profile');
        if (res.ok) {
          const json = (await res.json()) as { preferences?: Record<string, unknown> | null };
          existingPreferences = json.preferences ?? {};
        }
      } catch (err) {
        console.error('[useDiscovery] failed to read preferences:', err);
      }

      const preferences = { ...existingPreferences };
      if (!preferences.body_map) preferences.body_map = {};
      const bodyMapPrefs = preferences.body_map as Record<string, unknown>;
      const sceneSlug = currentScene.slug || currentScene.id;

      bodyMapPrefs[sceneSlug] = {
        zoneActionPreferences: bodyMapAnswer.passes.map((pass) => ({
          subject: pass.subject,
          gender: pass.gender,
          zoneActionPreferences: pass.zoneActionPreferences || {},
        })),
        updatedAt: new Date().toISOString(),
      };

      await savePreferenceProfile(preferences);

      try {
        await fetch('/api/body-map/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bodyMapAnswer, sceneSlug }),
        });
      } catch (err) {
        console.error('Error processing body map:', err);
      }

      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting body map:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, moveToNextScene]);

  const handleV3Response = useCallback(async (response: SceneV3Response) => {
    if (!currentScene) return;

    setSubmitting(true);
    try {
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

      await saveSceneResponse({
        scene_id: currentScene.id,
        scene_slug: (currentScene as unknown as { slug?: string }).slug || currentScene.id,
        question_type: response.type,
        answer,
      });

      const proposalId = proposalMap.get(currentScene.id);
      if (proposalId) {
        await updateProposalStatus(null, proposalId, 'answered');
      }

      await moveToNextScene();
    } catch (error) {
      console.error('Error submitting V3 response:', error);
    } finally {
      setSubmitting(false);
    }
  }, [currentScene, moveToNextScene, proposalMap]);

  const refreshScenes = useCallback(async () => {
    if (userProfile) {
      await fetchRegularScenes(userProfile.id, userProfile.gender as 'male' | 'female' | undefined);
    }
  }, [fetchRegularScenes, userProfile]);

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

    // Proposals
    isProposedScene: (sceneId: string) => proposalMap.has(sceneId),

    // Navigation
    moveToNextScene,
  };
}

/**
 * Scene Sequencing V3 - New architecture without nested follow-ups
 *
 * Key concepts:
 * - main_question: Primary topic scenes (shown in onboarding or discovery)
 * - clarification: Scenes that clarify a main_question (shown in discovery)
 * - intro_slide: Generated at runtime before clarification group
 * - Deduplication: clarification shown only once (first main_question wins)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SceneV2,
  SceneV2Extended,
  SceneType,
  IntroSlide,
  LocalizedString,
  OnboardingResponseValue,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface DiscoveryContextV3 {
  userId: string;
  userGender: 'male' | 'female';
  userInterestedIn: 'male' | 'female' | 'both';
  /** All scene responses (YES/VERY) - map of scene_slug to response value */
  sceneResponses: Record<string, OnboardingResponseValue>;
  userGates: Record<string, boolean>;
  shownClarifications: Set<string>;
  locale: 'ru' | 'en';
}

export interface NextScenesResult {
  introSlide?: IntroSlide;
  scenes: SceneV2Extended[];
  triggeredByMain?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if scene is allowed by user's gates
 */
function isSceneAllowedByGates(
  scene: SceneV2Extended,
  userGates: Record<string, boolean>
): boolean {
  const sceneGates = (scene.ai_context as { gates?: Record<string, string[]> })?.gates;
  if (!sceneGates) return true;

  // Check each gate category
  for (const [_category, requiredGates] of Object.entries(sceneGates)) {
    if (!requiredGates || requiredGates.length === 0) continue;

    // All required gates must be true (AND logic)
    const allGatesOpen = requiredGates.every((gate) => userGates[gate] === true);
    if (!allGatesOpen) return false;
  }

  return true;
}

/**
 * Generate intro slide text
 */
function generateIntroText(
  title: LocalizedString,
  locale: 'ru' | 'en'
): LocalizedString {
  const titleText = title[locale] || title.ru || title.en;
  return {
    ru: `Тебе нравится ${titleText.toLowerCase()}. Давай узнаем больше.`,
    en: `You like ${titleText.toLowerCase()}. Let's learn more.`,
  };
}

/**
 * Create intro slide from main_question scene
 */
function createIntroSlide(
  mainQuestion: SceneV2Extended,
  clarificationCount: number,
  locale: 'ru' | 'en'
): IntroSlide {
  return {
    main_question_slug: mainQuestion.slug,
    main_question_title: mainQuestion.title,
    image_url: mainQuestion.image_url || '',
    image_variants: mainQuestion.image_variants,
    intro_text: generateIntroText(mainQuestion.title, locale),
    clarification_count: clarificationCount,
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get clarification scenes for a main_question
 */
export async function getClarificationsFor(
  supabase: SupabaseClient,
  mainQuestionSlug: string,
  context: DiscoveryContextV3
): Promise<SceneV2Extended[]> {
  // Query scenes where clarification_for contains mainQuestionSlug
  // Since clarification_for is stored in JSON, we need to filter
  const { data: allScenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('version', 2)
    .not('scene_type', 'is', null);

  if (!allScenes) return [];

  const clarifications: SceneV2Extended[] = [];

  for (const scene of allScenes as SceneV2Extended[]) {
    // Check if this is a clarification for the main_question
    if ((scene.scene_type as string) !== 'clarification') continue;
    if (!scene.clarification_for?.includes(mainQuestionSlug)) continue;

    // Skip if already shown (deduplication)
    if (context.shownClarifications.has(scene.slug)) continue;

    // Check gates
    if (!isSceneAllowedByGates(scene, context.userGates)) continue;

    // Check role direction matches user preference
    if (!isRoleDirectionCompatible(scene, context)) continue;

    clarifications.push(scene);
  }

  // Sort by priority/intensity
  clarifications.sort((a, b) => {
    const priorityA = a.priority || 50;
    const priorityB = b.priority || 50;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return (a.intensity || 2) - (b.intensity || 2);
  });

  return clarifications;
}

/**
 * Check if scene's role_direction is compatible with user preferences
 */
function isRoleDirectionCompatible(
  scene: SceneV2Extended,
  context: DiscoveryContextV3
): boolean {
  const { role_direction } = scene;
  const { userGender, userInterestedIn } = context;

  // Universal/mutual/solo scenes work for everyone
  if (['universal', 'mutual', 'solo', 'group'].includes(role_direction)) {
    return true;
  }

  // m_to_f: man does to woman
  // f_to_m: woman does to man
  if (userGender === 'male' && userInterestedIn === 'female') {
    return role_direction === 'm_to_f';
  }
  if (userGender === 'female' && userInterestedIn === 'male') {
    return role_direction === 'f_to_m';
  }
  if (userInterestedIn === 'both') {
    return true;
  }

  return true;
}

/**
 * Get next scenes for discovery flow (V3 architecture)
 *
 * Logic:
 * 1. Find main_questions user showed interest in (onboarding YES/VERY)
 * 2. For each interested main_question:
 *    a. Show intro slide (first time only)
 *    b. Show clarification scenes
 * 3. Deduplication: clarification shown only once
 */
export async function getNextDiscoveryScenesV3(
  supabase: SupabaseClient,
  context: DiscoveryContextV3,
  batchSize: number = 5
): Promise<NextScenesResult> {
  // Find scenes user showed interest in (YES=1, VERY=2)
  const interestedScenes = Object.entries(context.sceneResponses)
    .filter(([_, value]) => value === 1 || value === 2)
    .map(([slug]) => slug);

  if (interestedScenes.length === 0) {
    return { scenes: [] };
  }

  // Try each scene until we find unshown clarifications
  for (const mainSlug of interestedScenes) {
    const clarifications = await getClarificationsFor(supabase, mainSlug, context);

    if (clarifications.length > 0) {
      // Get main_question scene for intro slide
      const { data: mainScene } = await supabase
        .from('scenes')
        .select('*')
        .eq('slug', mainSlug)
        .single();

      let introSlide: IntroSlide | undefined;

      // Check if this is first time entering this topic (show intro)
      const isFirstTimeInTopic = !await hasSeenIntroForMain(
        supabase,
        context.userId,
        mainSlug
      );

      if (mainScene && isFirstTimeInTopic) {
        introSlide = createIntroSlide(
          mainScene as SceneV2Extended,
          clarifications.length,
          context.locale
        );
      }

      return {
        introSlide,
        scenes: clarifications.slice(0, batchSize),
        triggeredByMain: mainSlug,
      };
    }
  }

  // No more clarifications to show
  return { scenes: [] };
}

/**
 * Check if user has seen intro slide for a main_question
 */
async function hasSeenIntroForMain(
  supabase: SupabaseClient,
  userId: string,
  mainSlug: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_clarification_tracking')
    .select('id')
    .eq('user_id', userId)
    .eq('triggered_by_main', mainSlug)
    .limit(1);

  return (data?.length || 0) > 0;
}

/**
 * Mark clarification as shown (for deduplication)
 */
export async function markClarificationShown(
  supabase: SupabaseClient,
  userId: string,
  clarificationSlug: string,
  triggeredByMain: string
): Promise<void> {
  await supabase
    .from('user_clarification_tracking')
    .upsert({
      user_id: userId,
      clarification_slug: clarificationSlug,
      triggered_by_main: triggeredByMain,
      shown_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,clarification_slug',
    });
}

/**
 * Get all shown clarifications for a user
 */
export async function getShownClarifications(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_clarification_tracking')
    .select('clarification_slug')
    .eq('user_id', userId);

  return new Set((data || []).map((r) => r.clarification_slug));
}

/**
 * Build discovery context from user data
 */
export async function buildDiscoveryContextV3(
  supabase: SupabaseClient,
  userId: string,
  locale: 'ru' | 'en' = 'ru'
): Promise<DiscoveryContextV3 | null> {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, interested_in')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  // Get all scene responses with YES/VERY answers
  // Build a map of scene_slug -> response value
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('scene_slug, answer')
    .eq('user_id', userId);

  // Build responses map: { scene_slug: value }
  const sceneResponses: Record<string, number> = {};
  for (const r of responses || []) {
    const slug = r.scene_slug;
    const value = (r.answer as { value?: number })?.value ?? 0;
    if (slug && value >= 1) {
      sceneResponses[slug] = value;
    }
  }

  // Get user gates
  const { data: gates } = await supabase
    .from('user_gates')
    .select('gates')
    .eq('user_id', userId)
    .single();

  // Get shown clarifications
  const shownClarifications = await getShownClarifications(supabase, userId);

  return {
    userId,
    userGender: profile.gender as 'male' | 'female',
    userInterestedIn: profile.interested_in as 'male' | 'female' | 'both',
    sceneResponses,
    userGates: gates?.gates || {},
    shownClarifications,
    locale,
  };
}

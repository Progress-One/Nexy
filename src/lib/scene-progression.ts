import type { SupabaseClient } from '@supabase/supabase-js';
import type { Scene, SceneV2 } from './types';
import { fetchUserGates, isSceneAllowed } from './onboarding-gates';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Exploration vs exploitation ratio (70% exploitation, 30% exploration)
 * Exploitation = show scenes matching user preferences
 * Exploration = show diverse/new scenes to discover new interests
 */
const EXPLOITATION_RATIO = 0.7;
// Note: Exploration ratio is implicitly (1 - EXPLOITATION_RATIO) = 0.3

/**
 * Initial phase: show mild scenes first (intensity 1-2)
 * After this many scenes, allow higher intensity based on comfort
 */
const MILD_PHASE_SCENE_COUNT = 10;


/**
 * Neutral role directions that match any preference
 */
const NEUTRAL_ROLE_DIRECTIONS = ['mutual', 'universal', 'solo', 'group'];

// ============================================================================
// INTER-SCENE GATES (scene requires previous scene answer)
// ============================================================================

/**
 * Scene prerequisites: advanced scenes require positive response on base scenes
 * Key = scene slug pattern (matched with includes())
 * Value = { requires: base scene patterns, minInterest: minimum interest level (0-100) }
 *
 * Logic: Scene is blocked until user answered positively on at least one required scene
 */
const SCENE_REQUIRES_SCENE: Record<string, { requires: string[]; minInterest: number }> = {
  // Oral progression
  'deepthroat': { requires: ['blowjob'], minInterest: 60 },
  'facesitting': { requires: ['cunnilingus'], minInterest: 60 },

  // Bondage progression
  'mummification': { requires: ['bondage'], minInterest: 70 },

  // Anal progression
  'fisting': { requires: ['anal'], minInterest: 70 },
  'double-penetration': { requires: ['anal', 'threesome'], minInterest: 60 },

  // Power exchange progression
  'pet-play': { requires: ['collar'], minInterest: 60 },

  // Sensory progression
  'electrostim': { requires: ['wax-play', 'ice-play'], minInterest: 60 },

  // Verbal progression
  'degradation': { requires: ['dirty-talk'], minInterest: 60 },

  // Group progression
  'gangbang': { requires: ['threesome'], minInterest: 70 },
  'orgy': { requires: ['threesome'], minInterest: 70 },
};

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Get all element IDs that user has already selected across all scenes
 */
export async function getAnsweredElementIds(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const answeredElements = new Set<string>();

  // Get all scene responses with selected elements
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('elements_selected')
    .eq('user_id', userId)
    .eq('skipped', false);

  if (responses) {
    for (const response of responses) {
      if (response.elements_selected && Array.isArray(response.elements_selected)) {
        for (const elementId of response.elements_selected) {
          answeredElements.add(elementId);
        }
      }
    }
  }

  return answeredElements;
}

/**
 * Get all tag_refs that user has already answered (from tag_preferences)
 * Includes both positive (interested) and negative (rejected) preferences
 */
export async function getAnsweredTagRefs(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const answeredTags = new Set<string>();

  // Get all tag preferences where user expressed an opinion (positive or negative)
  // interest_level > 0: interested, interest_level < 0: rejected
  const { data: tagPrefs } = await supabase
    .from('tag_preferences')
    .select('tag_ref, interest_level, experience_level')
    .eq('user_id', userId)
    .or('interest_level.neq.0,experience_level.not.is.null');

  if (tagPrefs) {
    for (const pref of tagPrefs) {
      if (pref.tag_ref) {
        answeredTags.add(pref.tag_ref);
      }
    }
  }

  return answeredTags;
}

/**
 * Check if scene should be skipped based on dedupe_by_tag logic
 * Currently disabled - always returns false
 */
export function shouldSkipSceneByDedupe(
  _scene: SceneV2,
  _answeredElementIds: Set<string>,
  _answeredTagRefs: Set<string>
): boolean {
  return false;
}

// ============================================================================
// INTER-SCENE GATES CHECKING
// ============================================================================

/**
 * Get user's responses to required prerequisite scenes
 * Returns map of scene slug pattern -> max interest level (0-100)
 */
export async function getSceneResponseInterests(
  supabase: SupabaseClient,
  userId: string
): Promise<Map<string, number>> {
  const interests = new Map<string, number>();

  // Get all scene responses with elements selected
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('scene_slug, elements_selected, skipped')
    .eq('user_id', userId)
    .eq('skipped', false);

  if (!responses) return interests;

  for (const response of responses) {
    if (!response.scene_slug) continue;

    // Calculate interest based on number of elements selected
    // More elements = higher interest (rough heuristic)
    const elementsCount = response.elements_selected?.length || 0;
    const interest = elementsCount > 0 ? Math.min(100, 40 + elementsCount * 20) : 0;

    // Store max interest for this scene pattern
    const currentInterest = interests.get(response.scene_slug) || 0;
    if (interest > currentInterest) {
      interests.set(response.scene_slug, interest);
    }
  }

  return interests;
}

/**
 * Check if scene is blocked by inter-scene prerequisites
 * Scene is blocked if user hasn't shown enough interest in required base scenes
 */
export function isSceneBlockedByPrerequisites(
  scene: SceneV2,
  sceneInterests: Map<string, number>
): boolean {
  const sceneSlug = scene.slug;
  if (!sceneSlug) return false;

  // Find matching prerequisite rule
  for (const [pattern, requirement] of Object.entries(SCENE_REQUIRES_SCENE)) {
    if (sceneSlug.includes(pattern)) {
      // Check if any required scene has sufficient interest
      const hasPrerequisite = requirement.requires.some((reqPattern) => {
        // Find any scene response matching the required pattern
        const entries = Array.from(sceneInterests.entries());
        return entries.some(([answeredSlug, interest]) =>
          answeredSlug.includes(reqPattern) && interest >= requirement.minInterest
        );
      });

      // Block if no prerequisite met
      if (!hasPrerequisite) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// ROLE MATCHING (Fixed)
// ============================================================================

/**
 * Check if scene role_direction matches user's role preference
 * Fixed: Previously both 'give' and 'receive' had identical checks
 *
 * @param rolePreference - User's preference: 'give' (active), 'receive' (passive), 'both'
 * @param roleDirection - Scene's direction: 'm_to_f', 'f_to_m', 'mutual', etc.
 * @param userGender - Optional: user's gender for more accurate matching
 */
export function matchesRolePreference(
  rolePreference: 'give' | 'receive' | 'both' | null,
  roleDirection: string | undefined,
  userGender?: 'male' | 'female'
): boolean {
  if (!rolePreference || !roleDirection) return true; // No preference = match all
  if (rolePreference === 'both') return true; // Both = match all

  // Neutral directions match everyone
  if (NEUTRAL_ROLE_DIRECTIONS.some(dir => roleDirection === dir)) {
    return true;
  }

  // Gender-aware matching for directional scenes
  if (userGender && (roleDirection === 'm_to_f' || roleDirection === 'f_to_m')) {
    if (rolePreference === 'give') {
      // User wants to be active: male→m_to_f, female→f_to_m
      return (userGender === 'male' && roleDirection === 'm_to_f') ||
             (userGender === 'female' && roleDirection === 'f_to_m');
    }
    if (rolePreference === 'receive') {
      // User wants to be passive: male→f_to_m, female→m_to_f
      return (userGender === 'male' && roleDirection === 'f_to_m') ||
             (userGender === 'female' && roleDirection === 'm_to_f');
    }
  }

  // Fallback: pattern-based matching (without gender info)
  if (rolePreference === 'give') {
    // User prefers active/dominant role
    return roleDirection.includes('dom') ||
           roleDirection.includes('daddy') ||
           roleDirection.includes('mommy') ||
           roleDirection.includes('keyholder') ||
           roleDirection === 'm_to_f' ||
           roleDirection === 'f_to_m'; // Both directions have an active party
  }

  if (rolePreference === 'receive') {
    // User prefers passive/submissive role
    return roleDirection.includes('sub') ||
           roleDirection.includes('pet') ||
           roleDirection.includes('little') ||
           roleDirection.includes('locked') ||
           roleDirection === 'm_to_f' ||
           roleDirection === 'f_to_m'; // Both directions have a passive party
  }

  return true;
}

// ============================================================================
// COMFORT SIGNALS / INTENSITY PROGRESSION
// ============================================================================

/**
 * Get user's comfort level based on their response history
 * Higher comfort = allow higher intensity scenes
 */
export async function getUserComfortLevel(
  supabase: SupabaseClient,
  userId: string
): Promise<{ maxIntensity: number; answeredCount: number; avgInterest: number }> {
  // Get count of answered scenes
  const { count: answeredCount } = await supabase
    .from('scene_responses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('skipped', false);

  // Get average interest level from tag preferences
  const { data: tagPrefs } = await supabase
    .from('tag_preferences')
    .select('interest_level, intensity_preference')
    .eq('user_id', userId);

  const validInterests = tagPrefs?.filter(p => p.interest_level && p.interest_level > 0) || [];
  const avgInterest = validInterests.length > 0
    ? validInterests.reduce((sum, p) => sum + (p.interest_level || 0), 0) / validInterests.length
    : 50;

  // Get average intensity preference
  const validIntensities = tagPrefs?.filter(p => p.intensity_preference && p.intensity_preference > 0) || [];
  const avgIntensityPref = validIntensities.length > 0
    ? validIntensities.reduce((sum, p) => sum + (p.intensity_preference || 0), 0) / validIntensities.length
    : 50;

  // Calculate max allowed intensity
  // Start with intensity 1-2, gradually increase based on:
  // 1. Number of scenes answered
  // 2. Average interest level
  // 3. Average intensity preference
  let maxIntensity = 2; // Start mild

  const count = answeredCount || 0;

  if (count >= MILD_PHASE_SCENE_COUNT) {
    // Past initial mild phase, allow progression
    maxIntensity = 3;

    if (avgInterest >= 60 || avgIntensityPref >= 60) {
      maxIntensity = 4;
    }

    if (avgInterest >= 75 && avgIntensityPref >= 70 && count >= 20) {
      maxIntensity = 5;
    }
  }

  return {
    maxIntensity,
    answeredCount: count,
    avgInterest,
  };
}

// ============================================================================
// CATEGORY COVERAGE (Breadth-First)
// ============================================================================

/**
 * Get categories that user has already seen
 */
export async function getSeenCategories(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const seenCategories = new Set<string>();

  // Join with scenes table to get actual category field
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('scene_id, scenes!inner(category)')
    .eq('user_id', userId);

  if (responses) {
    for (const r of responses) {
      const category = (r.scenes as unknown as { category: string | null })?.category;
      if (category) {
        seenCategories.add(category);
      }
    }
  }

  return seenCategories;
}

/**
 * Calculate breadth-first bonus for categories user hasn't seen yet
 */
export function calculateBreadthBonus(
  scene: SceneV2,
  seenCategories: Set<string>,
  totalAnsweredScenes: number
): number {
  // Only apply breadth-first in early discovery phase
  if (totalAnsweredScenes > 15) return 0;

  // Use category or first tag as category identifier
  const category = scene.category || scene.tags?.[0];
  if (!category) return 0;

  // Bonus for unseen categories (higher bonus early in discovery)
  if (!seenCategories.has(category)) {
    return Math.max(0, 20 - totalAnsweredScenes); // 20 points initially, decreasing
  }

  return 0;
}

// ============================================================================
// EXPLORATION VS EXPLOITATION
// ============================================================================

/**
 * Apply exploration/exploitation split to scored scenes
 * 70% exploitation (best matches), 30% exploration (random from remaining)
 */
export function applyExplorationExploitation(
  scoredScenes: Array<{ scene: SceneV2; score: number }>,
  limit: number
): SceneV2[] {
  if (scoredScenes.length <= limit) {
    return scoredScenes.map(s => s.scene);
  }

  const exploitCount = Math.ceil(limit * EXPLOITATION_RATIO);
  const exploreCount = limit - exploitCount;

  // Sort by score (highest first) for exploitation
  const sorted = [...scoredScenes].sort((a, b) => b.score - a.score);

  // Take top N for exploitation
  const exploitScenes = sorted.slice(0, exploitCount);

  // Random selection from remaining for exploration
  const remaining = sorted.slice(exploitCount);
  const exploreScenes: typeof scoredScenes = [];

  // Fisher-Yates shuffle for random selection
  const shuffled = [...remaining];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  exploreScenes.push(...shuffled.slice(0, exploreCount));

  // Combine and shuffle the final result to mix exploit and explore
  const combined = [...exploitScenes, ...exploreScenes];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.map(s => s.scene);
}

// ============================================================================
// MAIN SCORING FUNCTION (Fixed & Enhanced)
// ============================================================================

interface TagPref {
  tag_ref: string;
  interest_level: number | null;
  intensity_preference: number | null;
  role_preference: string | null;
}

/**
 * Calculate scene score synchronously (no DB calls)
 * All data must be pre-fetched and passed as parameters
 */
export function calculateSceneScoreSync(
  scene: SceneV2,
  tagPrefs: TagPref[],
  context: {
    seenCategories?: Set<string>;
    answeredCount?: number;
    answeredElementIds?: Set<string>;
    bodyMapGates?: Record<string, boolean>;
  }
): number {
  let score = 0;

  // Base score from priority (lower priority = higher score)
  const baseScore = 100 - (scene.priority || 50);
  score += baseScore;

  // Determine user's dominant role preference from tagPrefs
  let userRolePreference: 'give' | 'receive' | 'both' | null = null;
  if (tagPrefs.length > 0) {
    const roleCounts = { give: 0, receive: 0, both: 0 };
    for (const pref of tagPrefs) {
      if (pref.role_preference && pref.role_preference in roleCounts) {
        roleCounts[pref.role_preference as keyof typeof roleCounts]++;
      }
    }
    if (roleCounts.give > roleCounts.receive && roleCounts.give > roleCounts.both) {
      userRolePreference = 'give';
    } else if (roleCounts.receive > roleCounts.give && roleCounts.receive > roleCounts.both) {
      userRolePreference = 'receive';
    } else if (roleCounts.both > 0) {
      userRolePreference = 'both';
    }
  }

  if (tagPrefs.length > 0 && scene.elements) {
    const tagPrefMap = new Map(
      tagPrefs.map((pref) => [pref.tag_ref, pref])
    );

    // Boost score based on element interest levels
    for (const element of scene.elements) {
      const pref = tagPrefMap.get(element.tag_ref);
      if (pref) {
        // Interest level boost (0-100 -> 0-50 points)
        score += (pref.interest_level || 0) * 0.5;

        // Intensity preference match
        if (pref.intensity_preference && scene.intensity) {
          const intensityDiff = Math.abs(pref.intensity_preference - scene.intensity * 20);
          if (intensityDiff <= 20) {
            score += 10; // Bonus for matching intensity
          } else {
            score -= intensityDiff * 0.1; // Penalty for mismatch
          }
        }
      }
    }
  }

  // Role preference match using proper logic
  if (userRolePreference && scene.role_direction) {
    if (matchesRolePreference(userRolePreference, scene.role_direction)) {
      score += 15; // Significant bonus for role match
    } else {
      score -= 10; // Penalty for role mismatch
    }
  }

  // Penalty for high intensity if user hasn't shown interest in intense scenes
  const maxInterestLevel = tagPrefs.length > 0
    ? Math.max(0, ...tagPrefs.map((p) => p.interest_level || 0))
    : 0;
  if (scene.intensity > 3 && maxInterestLevel < 50) {
    score -= (scene.intensity - 3) * 10; // Penalty for high intensity
  }

  // Boost for scenes with elements user hasn't seen yet
  if (context.answeredElementIds && scene.elements) {
    const newElementsCount = scene.elements.filter(
      (e) => !context.answeredElementIds!.has(e.id)
    ).length;
    if (newElementsCount > 0) {
      score += newElementsCount * 5; // Bonus for new elements
    }
  }

  // Body map gates boost - boost scenes that match body map preferences
  if (context.bodyMapGates && Object.keys(context.bodyMapGates).length > 0) {
    const sceneTags = scene.tags || [];
    const sceneCategory = scene.category || '';

    // Check if any scene tags match open body map gates
    for (const tag of sceneTags) {
      if (context.bodyMapGates[tag]) {
        score += 15; // Significant bonus for body map match
      }
    }

    // Check category match
    if (context.bodyMapGates[sceneCategory]) {
      score += 10; // Category match bonus
    }

    // Check specific mappings
    const tagToGateMap: Record<string, string[]> = {
      anal: ['anal', 'rimming', 'pegging'],
      oral: ['oral', 'blowjob', 'cunnilingus'],
      foot_worship: ['foot_worship', 'foot_fetish', 'feet'],
      spanking: ['spanking', 'impact', 'discipline'],
      nipple_play: ['nipple_play', 'nipple_clamps', 'breast_play'],
    };

    for (const [gate, matchTags] of Object.entries(tagToGateMap)) {
      if (context.bodyMapGates[gate]) {
        const hasMatchingTag = sceneTags.some(t => matchTags.includes(t)) || matchTags.includes(sceneCategory);
        if (hasMatchingTag) {
          score += 20; // Strong bonus for specific body map interest match
        }
      }
    }
  }

  // Breadth-first bonus for category coverage
  if (context.seenCategories !== undefined && context.answeredCount !== undefined) {
    score += calculateBreadthBonus(scene, context.seenCategories, context.answeredCount);
  }

  // Ensure score is non-negative
  return Math.max(0, score);
}

/**
 * Calculate scene score based on user preferences (async version - DEPRECATED)
 * Use calculateSceneScoreSync instead for better performance
 */
export async function calculateSceneScore(
  scene: SceneV2,
  supabase: SupabaseClient,
  userId: string,
  context?: {
    seenCategories?: Set<string>;
    answeredCount?: number;
    userRolePreference?: 'give' | 'receive' | 'both' | null;
  }
): Promise<number> {
  // Fetch data and delegate to sync version
  const { data: tagPrefs } = await supabase
    .from('tag_preferences')
    .select('tag_ref, interest_level, intensity_preference, role_preference')
    .eq('user_id', userId);

  const answeredElementIds = await getAnsweredElementIds(supabase, userId);

  return calculateSceneScoreSync(scene, tagPrefs || [], {
    seenCategories: context?.seenCategories,
    answeredCount: context?.answeredCount,
    answeredElementIds,
  });
}

/**
 * Get adaptively ordered scenes based on user preferences and dedupe logic
 *
 * Enhanced with:
 * - Baseline gates filtering (blocked categories based on user's baseline responses)
 * - Comfort-based intensity progression (start mild, increase based on signals)
 * - Breadth-first category coverage (variety in early discovery)
 * - Exploration vs exploitation (70/30 split)
 */
export async function getAdaptiveScenes(
  supabase: SupabaseClient,
  userId: string,
  allScenes: Scene[],
  options: {
    maxIntensity?: number;
    limit?: number;
    enableDedupe?: boolean;
    enableAdaptiveScoring?: boolean;
    enableBaselineGates?: boolean;
    enableInterSceneGates?: boolean;
    enableComfortProgression?: boolean;
    enableExplorationExploitation?: boolean;
  } = {}
): Promise<SceneV2[]> {
  const {
    limit = 10,
    enableDedupe = true,
    enableAdaptiveScoring = true,
    enableBaselineGates = true,
    enableInterSceneGates = true,
    enableComfortProgression = true,
    enableExplorationExploitation = true,
  } = options;

  // ========================================
  // 1. COMFORT-BASED INTENSITY LIMIT
  // ========================================
  let maxIntensity = options.maxIntensity ?? 5;
  let answeredCount = 0;

  if (enableComfortProgression && !options.maxIntensity) {
    // Get user's comfort level to determine max intensity
    const comfort = await getUserComfortLevel(supabase, userId);
    maxIntensity = comfort.maxIntensity;
    answeredCount = comfort.answeredCount;
  }

  // ========================================
  // 2. FILTER V2 COMPOSITE SCENES
  // ========================================
  const v2Scenes = allScenes.filter((s) => {
    // Skip body_map scenes (they have their own flow)
    // Check via tags since question_type may not be in base Scene type
    if (s.tags?.includes('body_map')) return false;

    const scene = s as unknown as SceneV2;
    return scene.version === 2 && Array.isArray(scene.elements);
  }) as unknown as SceneV2[];

  // Filter by intensity (comfort-based)
  let filteredScenes = v2Scenes.filter((s) => s.intensity <= maxIntensity);

  // ========================================
  // 3. ONBOARDING GATES FILTERING
  // ========================================
  if (enableBaselineGates) {
    const userGates = await fetchUserGates(supabase, userId);
    filteredScenes = filteredScenes.filter(
      (scene) => isSceneAllowed(scene.slug, userGates)
    );
  }

  // ========================================
  // 3.5. INTER-SCENE GATES FILTERING
  // ========================================
  if (enableInterSceneGates) {
    const sceneInterests = await getSceneResponseInterests(supabase, userId);
    filteredScenes = filteredScenes.filter(
      (scene) => !isSceneBlockedByPrerequisites(scene, sceneInterests)
    );
  }

  // ========================================
  // 4. PRE-FETCH DATA FOR DEDUPE AND SCORING
  // ========================================
  // Fetch once, use for both dedupe and scoring
  const answeredElementIds = await getAnsweredElementIds(supabase, userId);
  const answeredTagRefs = enableDedupe ? await getAnsweredTagRefs(supabase, userId) : new Set<string>();

  if (enableDedupe) {
    filteredScenes = filteredScenes.filter(
      (scene) => !shouldSkipSceneByDedupe(scene, answeredElementIds, answeredTagRefs)
    );
  }

  // ========================================
  // 5. SCORE SCENES
  // ========================================
  if (enableAdaptiveScoring) {
    // Get context for scoring - fetch ONCE, not per scene
    const seenCategories = await getSeenCategories(supabase, userId);

    // Pre-fetch tag preferences ONCE (was being fetched 200+ times in calculateSceneScore!)
    const { data: tagPrefs } = await supabase
      .from('tag_preferences')
      .select('tag_ref, interest_level, intensity_preference, role_preference')
      .eq('user_id', userId);

    // Fetch body_map_gates for scoring boost
    const { data: userGatesData } = await supabase
      .from('user_gates')
      .select('body_map_gates')
      .eq('user_id', userId)
      .single();
    const bodyMapGates = (userGatesData?.body_map_gates as Record<string, boolean>) || {};

    // Calculate scores synchronously now that we have all data
    const scoredScenes = filteredScenes.map((scene) => ({
      scene,
      score: calculateSceneScoreSync(scene, tagPrefs || [], {
        seenCategories,
        answeredCount,
        answeredElementIds,
        bodyMapGates,
      }),
    }));

    // ========================================
    // 6. EXPLORATION VS EXPLOITATION
    // ========================================
    if (enableExplorationExploitation) {
      return applyExplorationExploitation(scoredScenes, limit);
    }

    // Sort by score (highest first)
    scoredScenes.sort((a, b) => b.score - a.score);

    // Return top N scenes
    return scoredScenes.slice(0, limit).map((item) => item.scene);
  } else {
    // Fallback to priority-based sorting
    const sorted = [...filteredScenes].sort((a, b) => {
      const priorityA = a.priority || 50;
      const priorityB = b.priority || 50;
      return priorityA - priorityB;
    });

    return sorted.slice(0, limit);
  }
}

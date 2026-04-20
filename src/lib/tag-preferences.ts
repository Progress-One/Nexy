import type { SupabaseClient } from '@/lib/supabase/compat-types';
import type { SceneV2, V2Element } from './types';

/**
 * Update tag_preferences based on composite scene response
 */
export async function updateTagPreferences(
  supabase: SupabaseClient,
  userId: string,
  scene: SceneV2,
  selectedElements: string[],
  elementResponses: Record<string, Record<string, unknown>> = {}
): Promise<void> {
  if (!selectedElements || selectedElements.length === 0) {
    return;
  }

  const sceneSlug = scene.slug || scene.id;

  // Process each selected element
  for (const elementId of selectedElements) {
    const element = scene.elements.find((e) => e.id === elementId);
    if (!element) continue;

    const tagRef = element.tag_ref;
    if (!tagRef) continue;

    // Get existing tag preference
    const { data: existing } = await supabase
      .from('tag_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tag_ref', tagRef)
      .single();

    // Calculate interest level (base: 50 for selection, can be adjusted by follow-ups)
    let interestLevel = 50;
    let rolePreference: 'give' | 'receive' | 'both' | null = null;
    let intensityPreference: number | null = null;
    const specificPreferences: Record<string, unknown> = {};
    let experienceLevel: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null = null;

    // Auto-detect role from scene slug (-give / -receive suffix)
    if (sceneSlug.endsWith('-give')) {
      rolePreference = 'give';
    } else if (sceneSlug.endsWith('-receive')) {
      rolePreference = 'receive';
    }

    // Process follow-up responses for this element (can override auto-detected role)
    const elementResponse = elementResponses[elementId];
    if (elementResponse) {
      for (const [followUpId, followUpAnswer] of Object.entries(elementResponse)) {
        // Find the follow-up to understand its type
        const followUp = element.follow_ups?.find((f) => f.id === followUpId);
        if (!followUp) continue;

        switch (followUp.type) {
          case 'role':
            // Extract role preference
            if (typeof followUpAnswer === 'string') {
              rolePreference = followUpAnswer as 'give' | 'receive' | 'both';
            }
            break;

          case 'intensity':
          case 'scale':
            // Extract intensity preference
            if (typeof followUpAnswer === 'number') {
              intensityPreference = followUpAnswer;
              // Adjust interest level based on intensity
              interestLevel = Math.max(30, Math.min(100, followUpAnswer));
            }
            break;

          case 'experience':
            // Extract experience level
            if (typeof followUpAnswer === 'string') {
              experienceLevel = followUpAnswer as 'tried' | 'want_to_try' | 'not_interested' | 'curious';
              // Adjust interest level based on experience
              if (experienceLevel === 'tried') {
                interestLevel = Math.max(interestLevel, 70);
              } else if (experienceLevel === 'want_to_try') {
                interestLevel = Math.max(interestLevel, 60);
              } else if (experienceLevel === 'not_interested') {
                interestLevel = Math.min(interestLevel, 30);
              }
            }
            break;

          default:
            // Store other follow-up answers in specific_preferences
            specificPreferences[followUpId] = followUpAnswer;
            break;
        }
      }
    }

    // Get source scenes list
    const sourceScenes = existing?.source_scenes || [];
    if (!sourceScenes.includes(sceneSlug)) {
      sourceScenes.push(sceneSlug);
    }

    // Merge specific preferences
    const mergedSpecificPreferences = {
      ...(existing?.specific_preferences as Record<string, unknown> || {}),
      ...specificPreferences,
    };

    // Upsert tag preference
    await supabase
      .from('tag_preferences')
      .upsert({
        user_id: userId,
        tag_ref: tagRef,
        interest_level: existing
          ? Math.max(existing.interest_level || 0, interestLevel) // Keep maximum interest
          : interestLevel,
        role_preference: rolePreference || existing?.role_preference || null,
        intensity_preference: intensityPreference || existing?.intensity_preference || null,
        specific_preferences: mergedSpecificPreferences,
        experience_level: experienceLevel || existing?.experience_level || null,
        source_scenes: sourceScenes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tag_ref',
      });
  }
}

/**
 * Mark tags as rejected (when user swipes left/says no)
 * Sets interest_level to -1 to indicate rejection
 */
export async function markTagsAsRejected(
  supabase: SupabaseClient,
  userId: string,
  tags: string[],
  sceneSlug: string
): Promise<void> {
  if (!tags || tags.length === 0) return;

  for (const tag of tags) {
    // Only mark as rejected if not already positively rated
    const { data: existing } = await supabase
      .from('tag_preferences')
      .select('interest_level')
      .eq('user_id', userId)
      .eq('tag_ref', tag)
      .single();

    // Skip if already has positive interest (don't override likes)
    if (existing && existing.interest_level > 0) {
      continue;
    }

    await supabase
      .from('tag_preferences')
      .upsert({
        user_id: userId,
        tag_ref: tag,
        interest_level: -1, // Negative = rejected
        source_scenes: [sceneSlug],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tag_ref',
      });
  }
}

/**
 * Update tag_preferences based on swipe response (V3 style - using scene.tags)
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param sceneTags - Tags from scene.tags array
 * @param sceneSlug - Scene slug for tracking
 * @param responseValue - Swipe value: 0=no, 1=yes, 2=very, 3=if_asked
 * @param experienceLevel - Optional: 0=never, 1=rarely, 2=often
 */
export async function updateTagPreferencesFromSwipe(
  supabase: SupabaseClient,
  userId: string,
  sceneTags: string[],
  sceneSlug: string,
  responseValue: number,
  experienceLevel?: number | null
): Promise<void> {
  if (!sceneTags || sceneTags.length === 0) return;

  // Map response value to interest level
  // 0 (no) → -1 (rejected)
  // 1 (yes) → 50 (interested)
  // 2 (very) → 80 (very interested)
  // 3 (if_asked) → 30 (conditionally interested)
  const interestLevelMap: Record<number, number> = {
    0: -1,   // rejected
    1: 50,   // interested
    2: 80,   // very interested
    3: 30,   // if partner asks
  };

  const interestLevel = interestLevelMap[responseValue] ?? 0;

  // Map experience level
  // 0 = never tried, 1 = rarely, 2 = often
  const experienceMap: Record<number, string> = {
    0: 'want_to_try',
    1: 'curious',
    2: 'tried',
  };

  const experience = experienceLevel !== null && experienceLevel !== undefined
    ? experienceMap[experienceLevel] || null
    : null;

  // Auto-detect role from scene slug
  let rolePreference: 'give' | 'receive' | 'both' | null = null;
  if (sceneSlug.includes('-give') || sceneSlug.includes('-m-to-f')) {
    rolePreference = 'give';
  } else if (sceneSlug.includes('-receive') || sceneSlug.includes('-f-to-m')) {
    rolePreference = 'receive';
  }

  // If rejected (value = 0), use markTagsAsRejected
  if (responseValue === 0) {
    await markTagsAsRejected(supabase, userId, sceneTags, sceneSlug);
    return;
  }

  // For positive responses, update each tag
  for (const tag of sceneTags) {
    // Skip meta tags that shouldn't be tracked
    if (tag === 'onboarding' || tag === 'baseline') continue;

    // Get existing preference
    const { data: existing } = await supabase
      .from('tag_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tag_ref', tag)
      .single();

    // Merge source scenes
    const sourceScenes = existing?.source_scenes || [];
    if (!sourceScenes.includes(sceneSlug)) {
      sourceScenes.push(sceneSlug);
    }

    // Upsert with max interest level (don't decrease)
    await supabase
      .from('tag_preferences')
      .upsert({
        user_id: userId,
        tag_ref: tag,
        interest_level: existing
          ? Math.max(existing.interest_level || 0, interestLevel)
          : interestLevel,
        role_preference: rolePreference || existing?.role_preference || null,
        experience_level: experience || existing?.experience_level || null,
        source_scenes: sourceScenes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tag_ref',
      });
  }
}

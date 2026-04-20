import type { SupabaseClient } from '@supabase/supabase-js';

const META_TAGS = new Set(['onboarding', 'baseline']);

const INTEREST_LEVEL_BY_SWIPE: Record<number, number> = {
  0: -1,  // no → rejected
  1: 50,  // yes → interested
  2: 80,  // very → very interested
  3: 30,  // if_asked → conditionally interested
};

const EXPERIENCE_BY_LEVEL: Record<number, string> = {
  0: 'want_to_try',
  1: 'curious',
  2: 'tried',
};

function inferRoleFromSlug(sceneSlug: string): 'give' | 'receive' | null {
  if (sceneSlug.includes('-give') || sceneSlug.includes('-m-to-f')) return 'give';
  if (sceneSlug.includes('-receive') || sceneSlug.includes('-f-to-m')) return 'receive';
  return null;
}

/**
 * Mark tags as rejected (swipe NO). Preserves prior positive ratings.
 */
export async function markTagsAsRejected(
  supabase: SupabaseClient,
  userId: string,
  tags: string[],
  sceneSlug: string
): Promise<void> {
  if (!tags || tags.length === 0) return;

  for (const tag of tags) {
    if (META_TAGS.has(tag)) continue;

    const { data: existing } = await supabase
      .from('tag_preferences')
      .select('interest_level')
      .eq('user_id', userId)
      .eq('tag_ref', tag)
      .single();

    if (existing && existing.interest_level > 0) continue;

    await supabase
      .from('tag_preferences')
      .upsert({
        user_id: userId,
        tag_ref: tag,
        interest_level: -1,
        source_scenes: [sceneSlug],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tag_ref',
      });
  }
}

/**
 * Update tag_preferences from a V3 swipe response.
 *
 * @param responseValue 0=no, 1=yes, 2=very, 3=if_asked
 * @param experienceLevel 0=never, 1=rarely, 2=often
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

  if (responseValue === 0) {
    await markTagsAsRejected(supabase, userId, sceneTags, sceneSlug);
    return;
  }

  const interestLevel = INTEREST_LEVEL_BY_SWIPE[responseValue] ?? 0;
  const experience = experienceLevel != null ? EXPERIENCE_BY_LEVEL[experienceLevel] ?? null : null;
  const rolePreference = inferRoleFromSlug(sceneSlug);

  for (const tag of sceneTags) {
    if (META_TAGS.has(tag)) continue;

    const { data: existing } = await supabase
      .from('tag_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tag_ref', tag)
      .single();

    const sourceScenes = existing?.source_scenes || [];
    if (!sourceScenes.includes(sceneSlug)) sourceScenes.push(sceneSlug);

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

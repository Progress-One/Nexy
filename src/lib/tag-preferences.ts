import type { SceneV2 } from './types';
import { db } from '@/lib/db';
import type { Json } from '@/lib/db/schema';

/**
 * Update tag_preferences based on composite scene response
 */
export async function updateTagPreferences(
  userId: string,
  scene: SceneV2,
  selectedElements: string[],
  elementResponses: Record<string, Record<string, unknown>> = {}
): Promise<void> {
  if (!selectedElements || selectedElements.length === 0) return;

  const sceneSlug = scene.slug || scene.id;

  for (const elementId of selectedElements) {
    const element = scene.elements.find((e) => e.id === elementId);
    if (!element) continue;

    const tagRef = element.tag_ref;
    if (!tagRef) continue;

    const existing = await db
      .selectFrom('tag_preferences')
      .selectAll()
      .where('user_id', '=', userId)
      .where('tag_ref', '=', tagRef)
      .executeTakeFirst();

    let interestLevel = 50;
    let rolePreference: 'give' | 'receive' | 'both' | null = null;
    let intensityPreference: number | null = null;
    const specificPreferences: Record<string, unknown> = {};
    let experienceLevel: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null = null;

    if (sceneSlug.endsWith('-give')) rolePreference = 'give';
    else if (sceneSlug.endsWith('-receive')) rolePreference = 'receive';

    const elementResponse = elementResponses[elementId];
    if (elementResponse) {
      for (const [followUpId, followUpAnswer] of Object.entries(elementResponse)) {
        const followUp = element.follow_ups?.find((f) => f.id === followUpId);
        if (!followUp) continue;

        switch (followUp.type) {
          case 'role':
            if (typeof followUpAnswer === 'string') {
              rolePreference = followUpAnswer as 'give' | 'receive' | 'both';
            }
            break;
          case 'intensity':
          case 'scale':
            if (typeof followUpAnswer === 'number') {
              intensityPreference = followUpAnswer;
              interestLevel = Math.max(30, Math.min(100, followUpAnswer));
            }
            break;
          case 'experience':
            if (typeof followUpAnswer === 'string') {
              experienceLevel = followUpAnswer as 'tried' | 'want_to_try' | 'not_interested' | 'curious';
              if (experienceLevel === 'tried') interestLevel = Math.max(interestLevel, 70);
              else if (experienceLevel === 'want_to_try') interestLevel = Math.max(interestLevel, 60);
              else if (experienceLevel === 'not_interested') interestLevel = Math.min(interestLevel, 30);
            }
            break;
          default:
            specificPreferences[followUpId] = followUpAnswer;
        }
      }
    }

    const sourceScenes: string[] = (existing?.source_scenes as string[] | null) ?? [];
    if (!sourceScenes.includes(sceneSlug)) sourceScenes.push(sceneSlug);

    const mergedSpecificPreferences = {
      ...((existing?.specific_preferences as Record<string, unknown>) ?? {}),
      ...specificPreferences,
    };

    const nextInterest = existing
      ? Math.max(existing.interest_level ?? 0, interestLevel)
      : interestLevel;

    await db
      .insertInto('tag_preferences')
      .values({
        user_id: userId,
        tag_ref: tagRef,
        interest_level: nextInterest,
        role_preference: rolePreference ?? existing?.role_preference ?? null,
        intensity_preference: intensityPreference ?? existing?.intensity_preference ?? null,
        specific_preferences: mergedSpecificPreferences as Json,
        experience_level: experienceLevel ?? existing?.experience_level ?? null,
        source_scenes: sourceScenes,
        updated_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'tag_ref']).doUpdateSet({
          interest_level: nextInterest,
          role_preference: rolePreference ?? existing?.role_preference ?? null,
          intensity_preference: intensityPreference ?? existing?.intensity_preference ?? null,
          specific_preferences: mergedSpecificPreferences as Json,
          experience_level: experienceLevel ?? existing?.experience_level ?? null,
          source_scenes: sourceScenes,
          updated_at: new Date(),
        })
      )
      .execute();
  }
}

/**
 * Mark tags as rejected (when user swipes left/says no)
 * Sets interest_level to -1 to indicate rejection
 */
export async function markTagsAsRejected(
  userId: string,
  tags: string[],
  sceneSlug: string
): Promise<void> {
  if (!tags || tags.length === 0) return;

  for (const tag of tags) {
    const existing = await db
      .selectFrom('tag_preferences')
      .select('interest_level')
      .where('user_id', '=', userId)
      .where('tag_ref', '=', tag)
      .executeTakeFirst();

    if (existing && (existing.interest_level ?? 0) > 0) continue;

    await db
      .insertInto('tag_preferences')
      .values({
        user_id: userId,
        tag_ref: tag,
        interest_level: -1,
        source_scenes: [sceneSlug],
        updated_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'tag_ref']).doUpdateSet({
          interest_level: -1,
          source_scenes: [sceneSlug],
          updated_at: new Date(),
        })
      )
      .execute();
  }
}

/**
 * Update tag_preferences based on swipe response (V3 style - using scene.tags)
 *
 * @param userId - User ID
 * @param sceneTags - Tags from scene.tags array
 * @param sceneSlug - Scene slug for tracking
 * @param responseValue - Swipe value: 0=no, 1=yes, 2=very, 3=if_asked
 * @param experienceLevel - Optional: 0=never, 1=rarely, 2=often
 */
export async function updateTagPreferencesFromSwipe(
  userId: string,
  sceneTags: string[],
  sceneSlug: string,
  responseValue: number,
  experienceLevel?: number | null
): Promise<void> {
  if (!sceneTags || sceneTags.length === 0) return;

  const interestLevelMap: Record<number, number> = { 0: -1, 1: 50, 2: 80, 3: 30 };
  const interestLevel = interestLevelMap[responseValue] ?? 0;

  const experienceMap: Record<number, string> = { 0: 'want_to_try', 1: 'curious', 2: 'tried' };
  const experience = experienceLevel != null ? (experienceMap[experienceLevel] ?? null) : null;

  let rolePreference: 'give' | 'receive' | 'both' | null = null;
  if (sceneSlug.includes('-give') || sceneSlug.includes('-m-to-f')) rolePreference = 'give';
  else if (sceneSlug.includes('-receive') || sceneSlug.includes('-f-to-m')) rolePreference = 'receive';

  if (responseValue === 0) {
    await markTagsAsRejected(userId, sceneTags, sceneSlug);
    return;
  }

  for (const tag of sceneTags) {
    if (tag === 'onboarding' || tag === 'baseline') continue;

    const existing = await db
      .selectFrom('tag_preferences')
      .selectAll()
      .where('user_id', '=', userId)
      .where('tag_ref', '=', tag)
      .executeTakeFirst();

    const sourceScenes: string[] = (existing?.source_scenes as string[] | null) ?? [];
    if (!sourceScenes.includes(sceneSlug)) sourceScenes.push(sceneSlug);

    const nextInterest = existing
      ? Math.max(existing.interest_level ?? 0, interestLevel)
      : interestLevel;

    await db
      .insertInto('tag_preferences')
      .values({
        user_id: userId,
        tag_ref: tag,
        interest_level: nextInterest,
        role_preference: rolePreference ?? existing?.role_preference ?? null,
        experience_level: experience ?? existing?.experience_level ?? null,
        source_scenes: sourceScenes,
        updated_at: new Date(),
      })
      .onConflict((oc) =>
        oc.columns(['user_id', 'tag_ref']).doUpdateSet({
          interest_level: nextInterest,
          role_preference: rolePreference ?? existing?.role_preference ?? null,
          experience_level: experience ?? existing?.experience_level ?? null,
          source_scenes: sourceScenes,
          updated_at: new Date(),
        })
      )
      .execute();
  }
}

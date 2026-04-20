// Supabase client is passed in; type depends on caller (browser or server)
import type { SupabaseClient } from '@/lib/supabase/compat-types';
import type { Locale, Scene } from './types';
import { ARCHETYPES, tagMatchesPrefixes } from './archetype-definitions';
import { humanizeTag } from './insights';

/**
 * Machine-readable reason keys for personal recommendations.
 */
export type PersonalRecommendationReason =
  | 'related_tag'
  | 'archetype_match'
  | 'unexplored_adjacent';

/**
 * Machine-readable reason keys for couple recommendations.
 */
export type CoupleRecommendationReason =
  | 'both_interested'
  | 'bridging'
  | 'hidden_match';

export interface PersonalRecommendation {
  scene: Scene;
  /** Localized explanation of why this scene was picked. */
  reason: string;
  reasonKey: PersonalRecommendationReason;
  /** Tag that anchored the recommendation (for UI debug/context). */
  anchorTag?: string;
}

export interface CoupleRecommendation {
  scene: Scene;
  reason: string;
  reasonKey: CoupleRecommendationReason;
  anchorTag?: string;
}

interface TagPreferenceRow {
  tag_ref: string;
  interest_level: number | null;
  role_preference: 'give' | 'receive' | 'both' | null;
  intensity_preference: number | null;
  experience_level: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null;
}

const VERY_INTERESTED_THRESHOLD = 75;
const INTERESTED_THRESHOLD = 50;

const REASON_COPY: Record<
  PersonalRecommendationReason | CoupleRecommendationReason,
  (label: string, locale: Locale) => string
> = {
  related_tag: (label, locale) =>
    locale === 'ru'
      ? `Похоже на то, что тебе понравилось (${label})`
      : `Because you liked ${label}`,
  archetype_match: (label, locale) =>
    locale === 'ru'
      ? `Совпадает с твоим архетипом: ${label}`
      : `Matches your archetype: ${label}`,
  unexplored_adjacent: (label, locale) =>
    locale === 'ru'
      ? `Новое направление рядом с ${label}`
      : `A new angle near ${label}`,
  both_interested: (label, locale) =>
    locale === 'ru'
      ? `Оба отметили интерес: ${label}`
      : `You both showed interest: ${label}`,
  bridging: (label, locale) =>
    locale === 'ru'
      ? `Мягкое введение в ${label}`
      : `A gentle intro to ${label}`,
  hidden_match: (label, locale) =>
    locale === 'ru'
      ? `Скрытое совпадение: ${label}`
      : `Hidden match: ${label}`,
};

function makeReason(
  key: PersonalRecommendationReason | CoupleRecommendationReason,
  anchor: string,
  locale: Locale,
): string {
  const fmt = REASON_COPY[key];
  return fmt ? fmt(humanizeTag(anchor), locale) : humanizeTag(anchor);
}

async function fetchSeenSceneIds(supabase: any, userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('scene_responses')
    .select('scene_id')
    .eq('user_id', userId);
  return new Set((data ?? []).map((r: { scene_id: string }) => r.scene_id));
}

async function fetchTagPrefs(supabase: any, userId: string): Promise<TagPreferenceRow[]> {
  const { data } = await supabase
    .from('tag_preferences')
    .select('tag_ref, interest_level, role_preference, intensity_preference, experience_level')
    .eq('user_id', userId);
  return (data ?? []) as TagPreferenceRow[];
}

/**
 * Fetch active scenes that contain at least one of the given tags,
 * excluding seen ones.
 */
async function fetchScenesByTags(
  supabase: any,
  tags: string[],
  excludeIds: Set<string>,
  limit: number,
  options: { maxIntensity?: number } = {},
): Promise<Scene[]> {
  if (tags.length === 0) return [];

  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('is_active', true)
    .overlaps('tags', tags)
    .limit(Math.max(limit * 4, 20));

  if (error || !data) return [];

  const filtered = (data as Scene[]).filter((s) => !excludeIds.has(s.id));
  if (options.maxIntensity !== undefined) {
    return filtered.filter((s) => (s.intensity ?? 0) <= options.maxIntensity!).slice(0, limit);
  }
  return filtered.slice(0, limit);
}

/**
 * Compute tag co-occurrence from scene tag arrays. For each top interest
 * tag, find other tags that frequently appear alongside it in the scenes
 * table.
 */
async function computeSceneCoTags(
  supabase: any,
  anchors: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (anchors.length === 0) return map;

  const { data } = await supabase
    .from('scenes')
    .select('tags')
    .eq('is_active', true)
    .overlaps('tags', anchors);

  if (!data) return map;

  for (const anchor of anchors) {
    const counts = new Map<string, number>();
    for (const row of data as { tags: string[] | null }[]) {
      const tags = row.tags ?? [];
      if (!tags.includes(anchor)) continue;
      for (const t of tags) {
        if (t === anchor) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
    map.set(anchor, sorted);
  }

  return map;
}

/**
 * Pick the user's top archetype by scoring with tag prefs.
 * Lightweight variant of the full scoring in insights.ts.
 */
function getTopArchetype(tagPrefs: TagPreferenceRow[]): { id: string; tags: string[] } | null {
  if (tagPrefs.length === 0) return null;

  let best: { id: string; score: number; tags: string[] } | null = null;

  for (const archetype of ARCHETYPES) {
    const highPrefixes = archetype.indicators.high ?? [];
    if (highPrefixes.length === 0) continue;

    const matching = tagPrefs.filter(
      (p) =>
        (p.interest_level ?? 0) >= INTERESTED_THRESHOLD &&
        tagMatchesPrefixes(p.tag_ref, highPrefixes),
    );
    if (matching.length === 0) continue;

    const avgInterest = matching.reduce((a, p) => a + (p.interest_level ?? 0), 0) / matching.length;
    const score = matching.length * (avgInterest / 100);

    if (!best || score > best.score) {
      best = { id: archetype.id, score, tags: highPrefixes };
    }
  }

  return best ? { id: best.id, tags: best.tags } : null;
}

/**
 * Build a set of tags the user already has non-zero data about.
 */
function exploredTagSet(tagPrefs: TagPreferenceRow[]): Set<string> {
  return new Set(tagPrefs.map((p) => p.tag_ref));
}

/**
 * Get personal recommendations ("try this because...").
 */
export async function getPersonalRecommendations(
  supabase: any,
  userId: string,
  limit = 5,
  locale: Locale = 'en',
): Promise<PersonalRecommendation[]> {
  const [tagPrefs, seenIds] = await Promise.all([
    fetchTagPrefs(supabase, userId),
    fetchSeenSceneIds(supabase, userId),
  ]);

  const recommendations: PersonalRecommendation[] = [];
  const usedSceneIds = new Set<string>();

  // 1) related_tag: for each top VERY-interested tag, pick a scene carrying
  // a cooccurring tag the user hasn't explored yet.
  const veryInterested = tagPrefs
    .filter((p) => (p.interest_level ?? 0) >= VERY_INTERESTED_THRESHOLD)
    .sort((a, b) => (b.interest_level ?? 0) - (a.interest_level ?? 0))
    .slice(0, 5);

  const anchors = veryInterested.map((p) => p.tag_ref);
  const coTagMap = await computeSceneCoTags(supabase, anchors);
  const explored = exploredTagSet(tagPrefs);

  for (const anchor of anchors) {
    if (recommendations.length >= limit) break;
    const coTags = (coTagMap.get(anchor) ?? []).filter((t) => !explored.has(t));
    if (coTags.length === 0) continue;

    const scenes = await fetchScenesByTags(supabase, coTags, seenIds, 3);
    for (const scene of scenes) {
      if (recommendations.length >= limit) break;
      if (usedSceneIds.has(scene.id)) continue;
      usedSceneIds.add(scene.id);
      recommendations.push({
        scene,
        reason: makeReason('related_tag', anchor, locale),
        reasonKey: 'related_tag',
        anchorTag: anchor,
      });
      break; // one scene per anchor for diversity
    }
  }

  // 2) archetype_match: scenes carrying tags from the user's top archetype.
  if (recommendations.length < limit) {
    const archetype = getTopArchetype(tagPrefs);
    if (archetype) {
      const { data } = await supabase
        .from('scenes')
        .select('*')
        .eq('is_active', true)
        .limit(50);
      const archTags = archetype.tags;
      const archScenes = ((data ?? []) as Scene[]).filter((s) => {
        if (seenIds.has(s.id) || usedSceneIds.has(s.id)) return false;
        const sceneTags = s.tags ?? [];
        return sceneTags.some((t) => tagMatchesPrefixes(t, archTags));
      });

      for (const scene of archScenes) {
        if (recommendations.length >= limit) break;
        usedSceneIds.add(scene.id);
        recommendations.push({
          scene,
          reason: makeReason('archetype_match', archetype.id, locale),
          reasonKey: 'archetype_match',
          anchorTag: archetype.id,
        });
      }
    }
  }

  // 3) unexplored_adjacent: tags adjacent to interests that the user hasn't
  // given any data on (gentle intensity).
  if (recommendations.length < limit) {
    for (const anchor of anchors) {
      if (recommendations.length >= limit) break;
      const coTags = (coTagMap.get(anchor) ?? []).filter((t) => !explored.has(t));
      if (coTags.length === 0) continue;
      const scenes = await fetchScenesByTags(supabase, coTags, seenIds, 5, { maxIntensity: 3 });
      for (const scene of scenes) {
        if (recommendations.length >= limit) break;
        if (usedSceneIds.has(scene.id)) continue;
        usedSceneIds.add(scene.id);
        recommendations.push({
          scene,
          reason: makeReason('unexplored_adjacent', anchor, locale),
          reasonKey: 'unexplored_adjacent',
          anchorTag: anchor,
        });
      }
    }
  }

  return recommendations.slice(0, limit);
}

/**
 * Get couple recommendations ("try this together because...").
 */
export async function getCoupleRecommendations(
  supabase: any,
  userId: string,
  partnerId: string,
  limit = 5,
  locale: Locale = 'en',
): Promise<CoupleRecommendation[]> {
  const [myPrefs, partnerPrefs, mySeen, partnerSeen] = await Promise.all([
    fetchTagPrefs(supabase, userId),
    fetchTagPrefs(supabase, partnerId),
    fetchSeenSceneIds(supabase, userId),
    fetchSeenSceneIds(supabase, partnerId),
  ]);

  const myMap = new Map(myPrefs.map((p) => [p.tag_ref, p]));
  const partnerMap = new Map(partnerPrefs.map((p) => [p.tag_ref, p]));

  const recommendations: CoupleRecommendation[] = [];
  const usedSceneIds = new Set<string>();
  const combinedSeen = new Set([...mySeen, ...partnerSeen]);

  // 1) both_interested: tags with high interest from both.
  const mutualTags: { tag: string; score: number }[] = [];
  for (const [tag, mine] of myMap) {
    const partner = partnerMap.get(tag);
    if (!partner) continue;
    const myInterest = mine.interest_level ?? 0;
    const partnerInterest = partner.interest_level ?? 0;
    if (myInterest >= INTERESTED_THRESHOLD && partnerInterest >= INTERESTED_THRESHOLD) {
      mutualTags.push({ tag, score: myInterest + partnerInterest });
    }
  }
  mutualTags.sort((a, b) => b.score - a.score);

  for (const { tag } of mutualTags) {
    if (recommendations.length >= limit) break;
    const scenes = await fetchScenesByTags(supabase, [tag], combinedSeen, 3);
    for (const scene of scenes) {
      if (recommendations.length >= limit) break;
      if (usedSceneIds.has(scene.id)) continue;
      usedSceneIds.add(scene.id);
      recommendations.push({
        scene,
        reason: makeReason('both_interested', tag, locale),
        reasonKey: 'both_interested',
        anchorTag: tag,
      });
      break;
    }
  }

  // 2) bridging: one wants, the other hasn't tried. Pick a mild (intensity<=2)
  // scene of that tag so the curious partner can get introduced.
  if (recommendations.length < limit) {
    for (const [tag, mine] of myMap) {
      if (recommendations.length >= limit) break;
      const partner = partnerMap.get(tag);
      const myInterest = mine.interest_level ?? 0;
      const partnerInterest = partner?.interest_level ?? 0;
      if (myInterest >= VERY_INTERESTED_THRESHOLD && partnerInterest < INTERESTED_THRESHOLD) {
        const scenes = await fetchScenesByTags(supabase, [tag], combinedSeen, 3, { maxIntensity: 2 });
        for (const scene of scenes) {
          if (recommendations.length >= limit) break;
          if (usedSceneIds.has(scene.id)) continue;
          usedSceneIds.add(scene.id);
          recommendations.push({
            scene,
            reason: makeReason('bridging', tag, locale),
            reasonKey: 'bridging',
            anchorTag: tag,
          });
          break;
        }
      }
    }
  }

  // 3) hidden_match: tags that the user considers "IF partner asks"
  // (experience_level = curious or want_to_try, but with neutral interest)
  // where the partner is actually interested.
  if (recommendations.length < limit) {
    for (const [tag, mine] of myMap) {
      if (recommendations.length >= limit) break;
      const partner = partnerMap.get(tag);
      if (!partner) continue;
      const partnerInterest = partner.interest_level ?? 0;
      const partnerIsOpen = partnerInterest >= INTERESTED_THRESHOLD;
      const mineIsCurious =
        (mine.experience_level === 'curious' || mine.experience_level === 'want_to_try') &&
        (mine.interest_level ?? 0) < INTERESTED_THRESHOLD;

      if (partnerIsOpen && mineIsCurious) {
        const scenes = await fetchScenesByTags(supabase, [tag], combinedSeen, 3, { maxIntensity: 3 });
        for (const scene of scenes) {
          if (recommendations.length >= limit) break;
          if (usedSceneIds.has(scene.id)) continue;
          usedSceneIds.add(scene.id);
          recommendations.push({
            scene,
            reason: makeReason('hidden_match', tag, locale),
            reasonKey: 'hidden_match',
            anchorTag: tag,
          });
          break;
        }
      }
    }
  }

  return recommendations.slice(0, limit);
}

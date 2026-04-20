import type { SupabaseClient } from '@/lib/supabase/compat-types';
import { ARCHETYPES, tagMatchesPrefixes, type ArchetypeDefinition } from './archetype-definitions';

interface TagPreference {
  tag_ref: string;
  interest_level: number | null;
  role_preference: 'give' | 'receive' | 'both' | null;
  intensity_preference: number | null;
  experience_level: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null;
}

interface MatchedArchetype {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  score: number;
}

const ARCHETYPE_THRESHOLD = 0.35;
const MAX_ARCHETYPES = 3;
const MIN_INTEREST_LEVEL = 50; // Tag must have at least this interest level to count

/**
 * Calculate give/receive balance from role preferences.
 * Returns -1 (all receive) to 1 (all give), 0 = balanced.
 */
function calculateGiveReceiveBalance(tagPrefs: TagPreference[]): number {
  let giveCount = 0;
  let receiveCount = 0;
  let bothCount = 0;

  for (const pref of tagPrefs) {
    if (pref.interest_level && pref.interest_level >= MIN_INTEREST_LEVEL) {
      if (pref.role_preference === 'give') {
        giveCount++;
      } else if (pref.role_preference === 'receive') {
        receiveCount++;
      } else if (pref.role_preference === 'both') {
        bothCount++;
      }
    }
  }

  const total = giveCount + receiveCount + bothCount;
  if (total === 0) return 0;

  const balance = (giveCount - receiveCount) / total;
  return Math.max(-1, Math.min(1, balance));
}

/**
 * Count how many tags match the given prefixes with sufficient interest.
 */
function countMatchingTags(
  tagPrefs: TagPreference[],
  prefixes: string[],
  minInterest: number = MIN_INTEREST_LEVEL
): number {
  return tagPrefs.filter(
    (pref) =>
      pref.interest_level !== null &&
      pref.interest_level >= minInterest &&
      tagMatchesPrefixes(pref.tag_ref, prefixes)
  ).length;
}

/**
 * Get average interest level for tags matching prefixes.
 */
function getAverageInterest(tagPrefs: TagPreference[], prefixes: string[]): number {
  const matching = tagPrefs.filter(
    (pref) =>
      pref.interest_level !== null &&
      pref.interest_level >= MIN_INTEREST_LEVEL &&
      tagMatchesPrefixes(pref.tag_ref, prefixes)
  );

  if (matching.length === 0) return 0;

  const sum = matching.reduce((acc, pref) => acc + (pref.interest_level || 0), 0);
  return sum / matching.length;
}

/**
 * Calculate archetype match score.
 */
function calculateArchetypeScore(
  archetype: ArchetypeDefinition,
  tagPrefs: TagPreference[],
  giveReceiveBalance: number
): number {
  let score = 0;
  let maxPossible = 0;

  // High indicators (weight: 3 points each)
  if (archetype.indicators.high) {
    const highMatches = countMatchingTags(tagPrefs, archetype.indicators.high);
    const avgInterest = getAverageInterest(tagPrefs, archetype.indicators.high);

    // Score based on how many high indicators match and their average interest
    if (highMatches > 0) {
      score += Math.min(highMatches, 4) * 3 * (avgInterest / 100);
    }
    maxPossible += 4 * 3; // Max 4 high indicators counted
  }

  // Moderate indicators (weight: 1.5 points each)
  if (archetype.indicators.moderate) {
    const modMatches = countMatchingTags(tagPrefs, archetype.indicators.moderate);
    const avgInterest = getAverageInterest(tagPrefs, archetype.indicators.moderate);

    if (modMatches > 0) {
      score += Math.min(modMatches, 3) * 1.5 * (avgInterest / 100);
    }
    maxPossible += 3 * 1.5;
  }

  // Low indicators (penalty for having them high)
  if (archetype.indicators.low) {
    const lowMatches = countMatchingTags(tagPrefs, archetype.indicators.low, 70);
    score -= lowMatches * 1.5;
  }

  // Role pattern matching (bonus: 4 points)
  if (archetype.indicators.rolePattern) {
    maxPossible += 4;

    switch (archetype.indicators.rolePattern) {
      case 'give':
        if (giveReceiveBalance > 0.2) {
          score += 4 * giveReceiveBalance;
        } else if (giveReceiveBalance < -0.2) {
          score -= 2;
        }
        break;
      case 'receive':
        if (giveReceiveBalance < -0.2) {
          score += 4 * Math.abs(giveReceiveBalance);
        } else if (giveReceiveBalance > 0.2) {
          score -= 2;
        }
        break;
      case 'balanced':
        if (Math.abs(giveReceiveBalance) < 0.3) {
          score += 4;
        } else {
          score -= 1;
        }
        break;
    }
  }

  // Normalize to 0-1
  return maxPossible > 0 ? Math.max(0, score / maxPossible) : 0;
}

/**
 * Calculate partner archetypes from tag_preferences.
 */
export async function calculatePartnerArchetypes(
  supabase: SupabaseClient,
  partnerId: string
): Promise<MatchedArchetype[]> {
  // Get all tag preferences for partner
  const { data: tagPrefs } = await supabase
    .from('tag_preferences')
    .select('tag_ref, interest_level, role_preference, intensity_preference, experience_level')
    .eq('user_id', partnerId);

  if (!tagPrefs || tagPrefs.length === 0) {
    return [];
  }

  // Calculate give/receive balance
  const giveReceiveBalance = calculateGiveReceiveBalance(tagPrefs as TagPreference[]);

  // Calculate archetype scores
  const archetypeScores: { archetype: ArchetypeDefinition; score: number }[] = [];

  for (const archetype of ARCHETYPES) {
    const score = calculateArchetypeScore(archetype, tagPrefs as TagPreference[], giveReceiveBalance);

    if (score >= ARCHETYPE_THRESHOLD) {
      archetypeScores.push({ archetype, score });
    }
  }

  // Sort by score and limit
  archetypeScores.sort((a, b) => b.score - a.score);
  const topArchetypes = archetypeScores.slice(0, MAX_ARCHETYPES);

  return topArchetypes.map(({ archetype, score }) => ({
    id: archetype.id,
    name: archetype.name,
    description: archetype.description,
    score,
  }));
}

/**
 * Get average intensity preference from tag_preferences.
 */
export async function getAverageIntensity(
  supabase: SupabaseClient,
  partnerId: string
): Promise<number | null> {
  const { data: tagPrefs } = await supabase
    .from('tag_preferences')
    .select('intensity_preference')
    .eq('user_id', partnerId)
    .not('intensity_preference', 'is', null);

  if (!tagPrefs || tagPrefs.length === 0) {
    return null;
  }

  const intensities = tagPrefs
    .map((p) => p.intensity_preference)
    .filter((v): v is number => v !== null);

  if (intensities.length === 0) return null;

  const sum = intensities.reduce((acc, val) => acc + val, 0);
  return sum / intensities.length;
}

/**
 * Get archetype by ID.
 */
export function getArchetypeById(id: string): ArchetypeDefinition | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

/**
 * Get all available archetypes.
 */
export function getAllArchetypes(): ArchetypeDefinition[] {
  return ARCHETYPES;
}

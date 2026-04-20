// Supabase client is passed in; type depends on caller (browser or server)
import type { SupabaseClient } from '@/lib/supabase/compat-types';
import type { Locale, LocalizedString } from './types';
import { ARCHETYPES, tagMatchesPrefixes, type ArchetypeDefinition } from './archetype-definitions';

/**
 * Insights data surfaced to the user after enough scene responses.
 *
 * Used by:
 *  - InsightsReveal component (mid-flow "aha" screen)
 *  - Profile page (full breakdown)
 */
export interface TopTag {
  /** Tag ref from tag_preferences (e.g. "bondage_material") */
  tag: string;
  /** Human-readable label (e.g. "Bondage Material") */
  label: string;
  /** 0-100 interest level */
  level: number;
  /** Role preference aggregated for this tag if available */
  role?: 'give' | 'receive' | 'both' | null;
  /** 0-100 intensity preference if available */
  intensity?: number | null;
}

export interface InsightsArchetype {
  id: string;
  name: string;
  emoji: string;
  summary: string;
  description: string;
  score: number;
}

/** Role give/receive/both distribution (percentages 0-100). */
export interface RoleBalance {
  give: number;
  receive: number;
  both: number;
  /** Number of tag prefs that contributed to the balance. */
  sampleSize: number;
}

/** Intensity distribution (percentages). */
export interface IntensityBreakdown {
  soft: number;
  moderate: number;
  intense: number;
  /** Mean intensity 0-100 */
  mean: number;
  sampleSize: number;
}

/** Experience distribution across tag prefs. */
export interface ExperienceBreakdown {
  tried: number;
  curious: number;
  want_to_try: number;
  not_interested: number;
  sampleSize: number;
}

export interface BodyMapInsights {
  /** Zones where user preference == love (flattened across passes). */
  lovedZones: string[];
  /** Zones where user preference == no. */
  dislikedZones: string[];
  hasData: boolean;
}

export interface InsightsData {
  topTags: TopTag[];
  archetype: InsightsArchetype | null;
  secondaryArchetypes: InsightsArchetype[];
  roleBalance: RoleBalance;
  intensity: IntensityBreakdown;
  experience: ExperienceBreakdown;
  bodyMap: BodyMapInsights;
  counters: {
    answeredCount: number;
    highInterestTags: number;
    daysInDiscovery: number;
  };
}

interface TagPreferenceRow {
  tag_ref: string;
  interest_level: number | null;
  role_preference: 'give' | 'receive' | 'both' | null;
  intensity_preference: number | null;
  experience_level: 'tried' | 'want_to_try' | 'not_interested' | 'curious' | null;
}

const MIN_INTEREST_FOR_ARCHETYPE = 50;
const ARCHETYPE_THRESHOLD = 0.35;

/**
 * Emojis per archetype id (fallback to a generic one).
 */
const ARCHETYPE_EMOJIS: Record<string, string> = {
  romantic_lover: '🌹',
  dominant: '👑',
  submissive: '🎀',
  switch: '🔄',
  sadist: '🔥',
  masochist: '⛓️',
  primal: '🐺',
  exhibitionist: '✨',
  voyeur: '👁️',
  sensualist: '🪶',
  brat: '😈',
  cuckold: '🎭',
  performer: '🎬',
  service_oriented: '🤲',
  pet: '🐾',
  explorer: '🧭',
};

function getArchetypeEmoji(id: string): string {
  return ARCHETYPE_EMOJIS[id] ?? '✨';
}

/**
 * Localized one-line summary per archetype. Falls back to the first sentence
 * of the canonical description if not overridden.
 */
const ARCHETYPE_SUMMARIES: Record<string, LocalizedString> = {
  romantic_lover: {
    ru: 'Эмоциональная близость важнее интенсивности.',
    en: 'Emotional closeness matters more than intensity.',
  },
  dominant: {
    ru: 'Ты любишь направлять и брать контроль.',
    en: 'You like to lead and take control.',
  },
  submissive: {
    ru: 'Ты находишь удовольствие в том, чтобы отдать контроль.',
    en: 'You find pleasure in letting go of control.',
  },
  switch: {
    ru: 'Тебе одинаково хорошо в обеих ролях.',
    en: 'You move comfortably between both sides.',
  },
  sadist: {
    ru: 'Тебя заводит давать консенсуальную интенсивность.',
    en: 'Giving consensual intensity turns you on.',
  },
  masochist: {
    ru: 'Яркие ощущения дают тебе разрядку.',
    en: 'Sharp sensations unlock your release.',
  },
  primal: {
    ru: 'Животная страсть и инстинкты — твой язык.',
    en: 'Animal passion and instincts are your language.',
  },
  exhibitionist: {
    ru: 'Взгляд со стороны включает тебя сильнее.',
    en: 'Being watched turns up your volume.',
  },
  voyeur: {
    ru: 'Ты ловишь огонь, наблюдая за другими.',
    en: 'You catch fire watching others.',
  },
  sensualist: {
    ru: 'Ощущения и текстуры важнее механики.',
    en: 'Sensations and textures beat mechanics.',
  },
  brat: {
    ru: 'Ты играешь в неподчинение, чтобы заслужить ответ.',
    en: 'You play at defiance to earn the response.',
  },
  cuckold: {
    ru: 'Чужое желание к партнёру заводит тебя.',
    en: "Another's desire for your partner lights you up.",
  },
  performer: {
    ru: 'Роли и сценарии — твоя стихия.',
    en: 'Roles and scenarios are your medium.',
  },
  service_oriented: {
    ru: 'Тебе вкусно заботиться и служить.',
    en: 'Caring and serving feels delicious to you.',
  },
  pet: {
    ru: 'Роль питомца — твоя зона отдыха.',
    en: 'The pet role is your safe escape.',
  },
  explorer: {
    ru: 'Любопытство ведёт тебя дальше.',
    en: 'Curiosity keeps pulling you forward.',
  },
};

function getArchetypeSummary(id: string, locale: Locale, fallback: string): string {
  const entry = ARCHETYPE_SUMMARIES[id];
  if (entry) {
    return entry[locale] || entry.en || fallback;
  }
  return fallback;
}

/**
 * Convert a tag ref like "power_dynamic_balanced" to "Power Dynamic Balanced".
 */
export function humanizeTag(tagRef: string): string {
  return tagRef
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function computeRoleBalance(tagPrefs: TagPreferenceRow[]): RoleBalance {
  let give = 0;
  let receive = 0;
  let both = 0;

  for (const pref of tagPrefs) {
    if ((pref.interest_level ?? 0) < MIN_INTEREST_FOR_ARCHETYPE) continue;
    if (pref.role_preference === 'give') give += 1;
    else if (pref.role_preference === 'receive') receive += 1;
    else if (pref.role_preference === 'both') both += 1;
  }

  const total = give + receive + both;
  if (total === 0) {
    return { give: 0, receive: 0, both: 0, sampleSize: 0 };
  }

  return {
    give: Math.round((give / total) * 100),
    receive: Math.round((receive / total) * 100),
    both: Math.round((both / total) * 100),
    sampleSize: total,
  };
}

function computeIntensity(tagPrefs: TagPreferenceRow[]): IntensityBreakdown {
  const values = tagPrefs
    .map((p) => p.intensity_preference)
    .filter((v): v is number => typeof v === 'number');

  if (values.length === 0) {
    return { soft: 0, moderate: 0, intense: 0, mean: 0, sampleSize: 0 };
  }

  let soft = 0;
  let moderate = 0;
  let intense = 0;
  for (const value of values) {
    if (value <= 33) soft += 1;
    else if (value <= 66) moderate += 1;
    else intense += 1;
  }

  const total = values.length;
  const mean = values.reduce((acc, v) => acc + v, 0) / total;

  return {
    soft: Math.round((soft / total) * 100),
    moderate: Math.round((moderate / total) * 100),
    intense: Math.round((intense / total) * 100),
    mean: Math.round(mean),
    sampleSize: total,
  };
}

function computeExperience(tagPrefs: TagPreferenceRow[]): ExperienceBreakdown {
  const counts = { tried: 0, curious: 0, want_to_try: 0, not_interested: 0 };
  let sampleSize = 0;

  for (const pref of tagPrefs) {
    if (!pref.experience_level) continue;
    counts[pref.experience_level] += 1;
    sampleSize += 1;
  }

  if (sampleSize === 0) {
    return { ...counts, sampleSize: 0 };
  }

  return {
    tried: Math.round((counts.tried / sampleSize) * 100),
    curious: Math.round((counts.curious / sampleSize) * 100),
    want_to_try: Math.round((counts.want_to_try / sampleSize) * 100),
    not_interested: Math.round((counts.not_interested / sampleSize) * 100),
    sampleSize,
  };
}

/**
 * Archetype scoring mirrors partner-archetypes.ts but is used for the
 * signed-in user (so we can run it client-side with their own data).
 */
function scoreArchetype(
  archetype: ArchetypeDefinition,
  tagPrefs: TagPreferenceRow[],
  balance: RoleBalance,
): number {
  let score = 0;
  let maxPossible = 0;

  const matchingCount = (prefixes: string[] | undefined, minInterest = MIN_INTEREST_FOR_ARCHETYPE) => {
    if (!prefixes) return { count: 0, avgInterest: 0 };
    const matching = tagPrefs.filter(
      (p) =>
        p.interest_level !== null &&
        p.interest_level >= minInterest &&
        tagMatchesPrefixes(p.tag_ref, prefixes),
    );
    if (matching.length === 0) return { count: 0, avgInterest: 0 };
    const avg = matching.reduce((a, p) => a + (p.interest_level ?? 0), 0) / matching.length;
    return { count: matching.length, avgInterest: avg };
  };

  if (archetype.indicators.high) {
    const { count, avgInterest } = matchingCount(archetype.indicators.high);
    if (count > 0) score += Math.min(count, 4) * 3 * (avgInterest / 100);
    maxPossible += 4 * 3;
  }

  if (archetype.indicators.moderate) {
    const { count, avgInterest } = matchingCount(archetype.indicators.moderate);
    if (count > 0) score += Math.min(count, 3) * 1.5 * (avgInterest / 100);
    maxPossible += 3 * 1.5;
  }

  if (archetype.indicators.low) {
    const { count } = matchingCount(archetype.indicators.low, 70);
    score -= count * 1.5;
  }

  // Role bonus: convert "give/receive/both" percentages into a -1..1 axis.
  const signedBalance = balance.sampleSize === 0
    ? 0
    : (balance.give - balance.receive) / 100;

  if (archetype.indicators.rolePattern) {
    maxPossible += 4;
    switch (archetype.indicators.rolePattern) {
      case 'give':
        if (signedBalance > 0.2) score += 4 * signedBalance;
        else if (signedBalance < -0.2) score -= 2;
        break;
      case 'receive':
        if (signedBalance < -0.2) score += 4 * Math.abs(signedBalance);
        else if (signedBalance > 0.2) score -= 2;
        break;
      case 'balanced':
        if (Math.abs(signedBalance) < 0.3) score += 4;
        else score -= 1;
        break;
    }
  }

  return maxPossible > 0 ? Math.max(0, score / maxPossible) : 0;
}

function buildArchetypes(
  tagPrefs: TagPreferenceRow[],
  balance: RoleBalance,
  locale: Locale,
): { primary: InsightsArchetype | null; secondary: InsightsArchetype[] } {
  const scored = ARCHETYPES
    .map((arch) => ({ arch, score: scoreArchetype(arch, tagPrefs, balance) }))
    .filter((s) => s.score >= ARCHETYPE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { primary: null, secondary: [] };
  }

  const toView = (arch: ArchetypeDefinition, score: number): InsightsArchetype => {
    const name = arch.name[locale] || arch.name.en;
    const description = arch.description[locale] || arch.description.en;
    return {
      id: arch.id,
      name,
      emoji: getArchetypeEmoji(arch.id),
      summary: getArchetypeSummary(arch.id, locale, description),
      description,
      score,
    };
  };

  return {
    primary: toView(scored[0].arch, scored[0].score),
    secondary: scored.slice(1, 3).map((s) => toView(s.arch, s.score)),
  };
}

/**
 * Derive loved/disliked body zones from stored preference_profiles.body_map blob.
 */
function extractBodyMapInsights(bodyMapBlob: unknown): BodyMapInsights {
  const empty: BodyMapInsights = { lovedZones: [], dislikedZones: [], hasData: false };
  if (!bodyMapBlob || typeof bodyMapBlob !== 'object') return empty;

  const loved = new Set<string>();
  const disliked = new Set<string>();

  for (const entry of Object.values(bodyMapBlob as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const passes = (entry as { zoneActionPreferences?: unknown }).zoneActionPreferences;
    if (!Array.isArray(passes)) continue;
    for (const pass of passes) {
      if (!pass || typeof pass !== 'object') continue;
      const zap = (pass as { zoneActionPreferences?: unknown }).zoneActionPreferences;
      if (!zap || typeof zap !== 'object') continue;
      for (const [zoneId, actions] of Object.entries(zap as Record<string, unknown>)) {
        if (!actions || typeof actions !== 'object') continue;
        for (const value of Object.values(actions as Record<string, unknown>)) {
          if (value === 'love') loved.add(zoneId);
          else if (value === 'no') disliked.add(zoneId);
        }
      }
    }
  }

  const lovedZones = Array.from(loved);
  const dislikedZones = Array.from(disliked);
  return {
    lovedZones,
    dislikedZones,
    hasData: lovedZones.length > 0 || dislikedZones.length > 0,
  };
}

/**
 * Main entry point. Pulls tag_preferences + body map data + counters and
 * returns a denormalized view for the UI.
 */
export async function computeUserInsights(
  supabase: any,
  userId: string,
  locale: Locale = 'en',
  options: { topTagLimit?: number } = {},
): Promise<InsightsData> {
  const { topTagLimit = 5 } = options;

  const [
    tagPrefsRes,
    answeredCountRes,
    profileRes,
    prefProfileRes,
  ] = await Promise.all([
    supabase
      .from('tag_preferences')
      .select('tag_ref, interest_level, role_preference, intensity_preference, experience_level')
      .eq('user_id', userId)
      .order('interest_level', { ascending: false, nullsFirst: false }),
    supabase
      .from('scene_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('preference_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const tagPrefs = (tagPrefsRes.data ?? []) as TagPreferenceRow[];

  const roleBalance = computeRoleBalance(tagPrefs);
  const intensity = computeIntensity(tagPrefs);
  const experience = computeExperience(tagPrefs);
  const archetypes = buildArchetypes(tagPrefs, roleBalance, locale);

  const topTags: TopTag[] = tagPrefs
    .filter((p) => (p.interest_level ?? 0) > 0)
    .slice(0, topTagLimit)
    .map((p) => ({
      tag: p.tag_ref,
      label: humanizeTag(p.tag_ref),
      level: p.interest_level ?? 0,
      role: p.role_preference,
      intensity: p.intensity_preference,
    }));

  const bodyMapBlob = (prefProfileRes.data?.preferences as Record<string, unknown> | undefined)?.body_map;
  const bodyMap = extractBodyMapInsights(bodyMapBlob);

  const highInterestTags = tagPrefs.filter((p) => (p.interest_level ?? 0) >= 70).length;

  let daysInDiscovery = 0;
  const createdAt = profileRes.data?.created_at;
  if (typeof createdAt === 'string' && createdAt.length > 0) {
    const created = new Date(createdAt).getTime();
    if (!Number.isNaN(created)) {
      daysInDiscovery = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
    }
  }

  return {
    topTags,
    archetype: archetypes.primary,
    secondaryArchetypes: archetypes.secondary,
    roleBalance,
    intensity,
    experience,
    bodyMap,
    counters: {
      answeredCount: answeredCountRes.count ?? 0,
      highInterestTags,
      daysInDiscovery,
    },
  };
}

/**
 * Fetch insights_shown_at timestamp for a user. Returns null if flow row
 * doesn't exist yet.
 */
export async function getInsightsShownAt(
  supabase: any,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('user_flow_state')
    .select('insights_shown_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  const value = (data as { insights_shown_at?: string | null }).insights_shown_at;
  return value ?? null;
}

/**
 * Mark that the "Insights Reveal" screen has been shown for this user.
 * Idempotent: only sets the timestamp if it's still null.
 */
export async function markInsightsShown(
  supabase: any,
  userId: string,
): Promise<void> {
  const existing = await getInsightsShownAt(supabase, userId);
  if (existing) return;

  const nowIso = new Date().toISOString();

  const { data: flowState } = await supabase
    .from('user_flow_state')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (flowState) {
    await supabase
      .from('user_flow_state')
      .update({ insights_shown_at: nowIso })
      .eq('user_id', userId);
  } else {
    await supabase
      .from('user_flow_state')
      .insert({ user_id: userId, insights_shown_at: nowIso });
  }
}

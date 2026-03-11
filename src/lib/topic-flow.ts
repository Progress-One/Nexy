import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface SceneRef {
  id: string;
  gate_keys: string[];
  require_very?: boolean;
}

export interface Topic {
  id: string;
  title: { ru: string; en: string };
  intensity: number;
  require_very?: boolean;
  skip_if_body_map?: {
    zones: string[];
    actions: string[];
    condition: string;
  };
  scenes: SceneRef[];
}

export interface TopicsData {
  version: number;
  description: string;
  topics: Topic[];
  body_map_to_topic: Record<string, string[]>;
  gate_to_topics: Record<string, string[]>;
}

export type InterestLevel = 'very' | 'yes' | 'unknown' | 'no';

export interface SceneWithScore {
  scene: SceneRef;
  topic: Topic;
  matchingGateKeys: string[];
  score: number; // count of matching gate_keys (VERY=2, YES=1)
}

export interface TopicWithInterest {
  topic: Topic;
  interestLevel: InterestLevel;
  interestScore: number; // VERY=2, YES=1, UNKNOWN=-1, NO=skip
}

// ============================================================================
// LOAD TOPICS DATA
// ============================================================================

// Dynamic import for server-side only
let cachedTopicsData: TopicsData | null = null;

export async function getTopicsData(): Promise<TopicsData> {
  if (cachedTopicsData) {
    return cachedTopicsData;
  }

  // Server-side: read from file system
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'scenes/v2/topics.json');
    const content = await fs.readFile(filePath, 'utf-8');
    cachedTopicsData = JSON.parse(content) as TopicsData;
    return cachedTopicsData;
  }

  // Client-side: fetch from API
  const response = await fetch('/api/admin/topics');
  if (!response.ok) {
    throw new Error('Failed to fetch topics data');
  }
  cachedTopicsData = await response.json();
  return cachedTopicsData!;
}

// ============================================================================
// GATE KEY SCORING
// ============================================================================

/**
 * Calculate score for a scene based on matching gate_keys
 * Returns: { score, matchingKeys }
 * - VERY = 2 points per key
 * - YES = 1 point per key
 * - UNKNOWN = 0 points (doesn't block)
 * - If ALL gate_keys = NO, scene is excluded
 */
export function calculateSceneScore(
  scene: SceneRef,
  gates: Record<string, string>
): { score: number; matchingKeys: string[]; allNo: boolean } {
  const matchingKeys: string[] = [];
  let score = 0;
  let hasNonNo = false;

  for (const gateKey of scene.gate_keys) {
    const gateValue = gates[gateKey];

    if (gateValue === 'very') {
      score += 2;
      matchingKeys.push(gateKey);
      hasNonNo = true;
    } else if (gateValue === 'yes') {
      score += 1;
      matchingKeys.push(gateKey);
      hasNonNo = true;
    } else if (gateValue !== 'no') {
      // unknown or undefined - doesn't contribute to score but doesn't block
      hasNonNo = true;
    }
    // if 'no' - doesn't contribute and doesn't set hasNonNo
  }

  return {
    score,
    matchingKeys,
    allNo: !hasNonNo, // all gate_keys are 'no'
  };
}

/**
 * Check if topic should be skipped based on body map responses
 */
function checkBodyMapSkipCondition(
  skipCondition: {
    zones: string[];
    actions: string[];
    condition: string;
  },
  bodyMapGates: Record<string, boolean>
): boolean {
  const { zones, actions, condition } = skipCondition;

  if (condition !== 'all_no') return false;

  // Check if ALL zone+action combinations are 'no' (false)
  for (const zone of zones) {
    for (const action of actions) {
      const key = `${zone}_${action}`;
      // If any is true (yes) or undefined (unknown), don't skip
      if (bodyMapGates[key] === true || bodyMapGates[key] === undefined) {
        return false;
      }
    }
  }

  // All combinations are 'no' -> skip this topic
  return true;
}

// ============================================================================
// BATCH INTEREST LEVELS
// ============================================================================

/**
 * Get interest levels for all topics at once (more efficient)
 * V3: Derives topic interest from scene gate_keys
 */
export async function getAllTopicInterestLevels(
  supabase: SupabaseClient,
  userId: string
): Promise<Map<string, InterestLevel>> {
  const levels = new Map<string, InterestLevel>();
  const topicsData = await getTopicsData();

  // Get user gates once
  const { data: userGates } = await supabase
    .from('user_gates')
    .select('gates, body_map_gates')
    .eq('user_id', userId)
    .single();

  const gates = (userGates?.gates as Record<string, string>) || {};
  const bodyMapGates = (userGates?.body_map_gates as Record<string, boolean>) || {};

  for (const topic of topicsData.topics) {
    // Check body map skip condition first
    if (topic.skip_if_body_map) {
      const shouldSkip = checkBodyMapSkipCondition(topic.skip_if_body_map, bodyMapGates);
      if (shouldSkip) {
        levels.set(topic.id, 'no');
        continue;
      }
    }

    // V3: Derive topic interest from max scene score
    let maxScore = 0;
    let allScenesNo = true;

    for (const scene of topic.scenes) {
      if (!scene.gate_keys || scene.gate_keys.length === 0) {
        allScenesNo = false;
        continue;
      }

      const { score, allNo } = calculateSceneScore(scene, gates);
      if (!allNo) allScenesNo = false;
      if (score > maxScore) maxScore = score;
    }

    if (allScenesNo && topic.scenes.length > 0) {
      levels.set(topic.id, 'no');
    } else if (maxScore >= 2) {
      levels.set(topic.id, 'very');
    } else if (maxScore >= 1) {
      levels.set(topic.id, 'yes');
    } else {
      levels.set(topic.id, 'unknown');
    }
  }

  return levels;
}

// ============================================================================
// SORT TOPICS
// ============================================================================

/**
 * Convert interest level to numeric score for sorting
 * VERY = 2, YES = 1, UNKNOWN = -1, NO = skip (not in result)
 */
function interestToScore(level: InterestLevel): number {
  switch (level) {
    case 'very': return 2;
    case 'yes': return 1;
    case 'unknown': return -1;
    case 'no': return -999; // Will be filtered out
  }
}

/**
 * Get sorted topics for discovery flow
 * Order: VERY interest → YES interest → Unknown
 * Within same interest: order by intensity (lower first)
 * Excludes topics where interest = NO
 */
export async function getSortedTopics(
  supabase: SupabaseClient,
  userId: string
): Promise<TopicWithInterest[]> {
  const topicsData = await getTopicsData();
  const interestLevels = await getAllTopicInterestLevels(supabase, userId);

  const topicsWithInterest: TopicWithInterest[] = [];

  for (const topic of topicsData.topics) {
    const interestLevel = interestLevels.get(topic.id) || 'unknown';

    // Skip topics with NO interest
    if (interestLevel === 'no') continue;

    // For require_very topics, skip if interest is not 'very'
    if (topic.require_very && interestLevel !== 'very') continue;

    topicsWithInterest.push({
      topic,
      interestLevel,
      interestScore: interestToScore(interestLevel),
    });
  }

  // Sort: by interest score DESC, then by intensity ASC
  topicsWithInterest.sort((a, b) => {
    // First by interest score (higher = better)
    if (a.interestScore !== b.interestScore) {
      return b.interestScore - a.interestScore;
    }
    // Then by intensity (lower = first)
    return a.topic.intensity - b.topic.intensity;
  });

  return topicsWithInterest;
}

// ============================================================================
// SCENE SCORING AND FILTERING
// ============================================================================

/**
 * Get all scenes with scores, sorted by score (highest first)
 * Filters out scenes where ALL gate_keys = NO
 * Also filters out scenes with require_very if no gate_key = VERY
 * Also filters out inactive scenes (is_active=false in DB)
 */
export async function getScoredScenes(
  supabase: SupabaseClient,
  userId: string
): Promise<SceneWithScore[]> {
  const topicsData = await getTopicsData();

  // Get user gates and active scenes in parallel
  const [userGatesResult, activeScenesResult] = await Promise.all([
    supabase
      .from('user_gates')
      .select('gates, body_map_gates')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('scenes')
      .select('slug')
      .eq('is_active', true),
  ]);

  const gates = (userGatesResult.data?.gates as Record<string, string>) || {};
  const bodyMapGates = (userGatesResult.data?.body_map_gates as Record<string, boolean>) || {};
  const activeSceneSlugs = new Set(activeScenesResult.data?.map((s) => s.slug) || []);

  const scoredScenes: SceneWithScore[] = [];

  for (const topic of topicsData.topics) {
    // Check body map skip condition for topic
    if (topic.skip_if_body_map) {
      const shouldSkip = checkBodyMapSkipCondition(topic.skip_if_body_map, bodyMapGates);
      if (shouldSkip) continue;
    }

    for (const scene of topic.scenes) {
      // Skip inactive scenes (not in DB or is_active=false)
      if (!activeSceneSlugs.has(scene.id)) continue;

      // Skip scenes without gate_keys (shouldn't happen in v3)
      if (!scene.gate_keys || scene.gate_keys.length === 0) continue;

      const { score, matchingKeys, allNo } = calculateSceneScore(scene, gates);

      // Skip if ALL gate_keys = NO
      if (allNo) continue;

      // Check require_very - need at least one VERY gate_key match
      if (scene.require_very || topic.require_very) {
        const hasVery = scene.gate_keys.some((key) => gates[key] === 'very');
        if (!hasVery) continue;
      }

      scoredScenes.push({
        scene,
        topic,
        matchingGateKeys: matchingKeys,
        score,
      });
    }
  }

  // Sort by score DESC, then by topic intensity ASC
  scoredScenes.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score; // higher score first
    }
    return a.topic.intensity - b.topic.intensity; // lower intensity first
  });

  return scoredScenes;
}

/**
 * Get available scenes for a topic (filtered by gates)
 */
async function getAvailableScenesForTopic(
  supabase: SupabaseClient,
  userId: string,
  topic: Topic
): Promise<SceneRef[]> {
  // Get user gates
  const { data: userGates } = await supabase
    .from('user_gates')
    .select('gates')
    .eq('user_id', userId)
    .single();

  const gates = (userGates?.gates as Record<string, string>) || {};

  return topic.scenes.filter((scene) => {
    if (!scene.gate_keys || scene.gate_keys.length === 0) return true;

    const { allNo } = calculateSceneScore(scene, gates);
    if (allNo) return false;

    // Check require_very
    if (scene.require_very || topic.require_very) {
      const hasVery = scene.gate_keys.some((key) => gates[key] === 'very');
      if (!hasVery) return false;
    }

    return true;
  });
}

// ============================================================================
// DISCOVERY STATE TRACKING
// ============================================================================

/**
 * Get discovery progress for user
 * Returns current topic index and scene index within that topic
 */
export async function getDiscoveryProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  currentTopicIndex: number;
  seenSceneIds: Set<string>;
  completedTopicIds: Set<string>;
}> {
  // Get scene responses to determine what user has seen
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('scene_slug')
    .eq('user_id', userId);

  const seenSceneIds = new Set<string>();
  if (responses) {
    for (const r of responses) {
      if (r.scene_slug) {
        seenSceneIds.add(r.scene_slug);
      }
    }
  }

  // Get sorted topics to determine current position
  const sortedTopics = await getSortedTopics(supabase, userId);

  // Find first topic that has unseen scenes
  let currentTopicIndex = 0;
  const completedTopicIds = new Set<string>();

  for (let i = 0; i < sortedTopics.length; i++) {
    const { topic } = sortedTopics[i];
    const availableScenes = await getAvailableScenesForTopic(supabase, userId, topic);

    // Check if all scenes in this topic have been seen
    const unseenScenes = availableScenes.filter((s) => !seenSceneIds.has(s.id));

    if (unseenScenes.length === 0) {
      completedTopicIds.add(topic.id);
    } else {
      currentTopicIndex = i;
      break;
    }
  }

  return {
    currentTopicIndex,
    seenSceneIds,
    completedTopicIds,
  };
}

/**
 * Get next scene to show in discovery flow
 * V3: Uses scored scenes sorted by matching gate_keys count
 */
export async function getNextDiscoveryScene(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  topic: Topic;
  scene: SceneRef;
  score: number;
  matchingGateKeys: string[];
  isNewTopic: boolean;
  sceneIndex: number;
  totalScenes: number;
} | null> {
  // Get all scored scenes
  const scoredScenes = await getScoredScenes(supabase, userId);

  if (scoredScenes.length === 0) {
    return null;
  }

  // Get seen scene IDs
  const { data: responses } = await supabase
    .from('scene_responses')
    .select('scene_slug')
    .eq('user_id', userId);

  const seenSceneIds = new Set<string>();
  if (responses) {
    for (const r of responses) {
      if (r.scene_slug) {
        seenSceneIds.add(r.scene_slug);
      }
    }
  }

  // Find first unseen scene (already sorted by score)
  for (let i = 0; i < scoredScenes.length; i++) {
    const { scene, topic, score, matchingGateKeys } = scoredScenes[i];

    if (!seenSceneIds.has(scene.id)) {
      // Check if this is the first scene of this topic for this user
      const topicSceneIds = topic.scenes.map((s) => s.id);
      const seenFromThisTopic = topicSceneIds.filter((id) => seenSceneIds.has(id));
      const isNewTopic = seenFromThisTopic.length === 0;

      return {
        topic,
        scene,
        score,
        matchingGateKeys,
        isNewTopic,
        sceneIndex: i,
        totalScenes: scoredScenes.length,
      };
    }
  }

  // All scenes completed
  return null;
}

// ============================================================================
// TOPIC INTRO DATA
// ============================================================================

/**
 * Get intro data for a topic
 */
export function getTopicIntro(
  topic: Topic,
  locale: 'ru' | 'en' = 'ru'
): {
  title: string;
  scenesCount: number;
} {
  return {
    title: topic.title[locale],
    scenesCount: topic.scenes.length,
  };
}

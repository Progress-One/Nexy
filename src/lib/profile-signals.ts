import type {
  Answer,
  SceneV2,
  SignalUpdate,
  PsychologicalProfile,
  BodyMapAnswer,
  BodyZoneId,
} from './types';
import type { SupabaseClient } from '@/lib/supabase/compat-types';

/**
 * Get response category from answer
 */
function getResponseCategory(answer: Answer): 'positive' | 'negative' | 'curious' {
  if ('value' in answer) {
    if (typeof answer.value === 'number') {
      if (answer.value >= 70) return 'positive';
      if (answer.value <= 30) return 'negative';
      return 'curious';
    }
    if (typeof answer.value === 'string') {
      if (answer.value === 'yes') return 'positive';
      if (answer.value === 'no') return 'negative';
      return 'curious';
    }
  }
  if ('selected' in answer && Array.isArray(answer.selected) && answer.selected.length > 0) {
    return 'positive';
  }
  return 'curious';
}

/**
 * Calculate signal updates based on user's answer to a V2 scene
 */
export function calculateSignalUpdates(
  answer: Answer,
  scene: SceneV2
): SignalUpdate[] {
  // V2 scenes use ai_context.tests_primary and tests_secondary
  // Map selected elements to signals
  const updates: SignalUpdate[] = [];
  const category = getResponseCategory(answer);
  const weight = getSignalWeight(answer, category);

  // For V2, use selected elements as signals
  if ('selected' in answer && Array.isArray(answer.selected)) {
    for (const elementId of answer.selected) {
      const element = scene.elements.find((e) => e.id === elementId);
      if (element) {
        updates.push({
          signal: element.tag_ref,
          weight: category === 'positive' ? weight : -weight,
        });
      }
    }
  } else if ('value' in answer && typeof answer.value === 'number') {
    // For scale answers, use primary tests
    scene.ai_context.tests_primary?.forEach((test) => {
      updates.push({
        signal: test,
        weight: category === 'positive' ? weight : -weight,
      });
    });
  }

  return updates;
}

/**
 * Calculate weight based on answer intensity
 */
function getSignalWeight(answer: Answer, category: 'positive' | 'negative' | 'curious'): number {
  if ('value' in answer && typeof answer.value === 'number') {
    // Scale answer: weight based on distance from neutral (50)
    const value = answer.value;
    if (category === 'positive') {
      return 0.5 + ((value - 60) / 80); // 0.5 at 60, 1.0 at 100
    }
    if (category === 'negative') {
      return 0.5 + ((40 - value) / 80); // 0.5 at 40, 1.0 at 0
    }
    return 0.5; // Curious: neutral weight
  }

  // Default weight for non-scale answers
  return 1.0;
}

/**
 * Calculate test score updates based on answer
 */
export function calculateTestScoreUpdates(
  answer: Answer,
  scene: SceneV2
): Record<string, number> {
  // V2 uses tests_primary and tests_secondary
  const updates: Record<string, number> = {};
  
  if ('value' in answer && typeof answer.value === 'number') {
    const value = answer.value;
    scene.ai_context.tests_primary?.forEach((test) => {
      updates[test] = value;
    });
    scene.ai_context.tests_secondary?.forEach((test) => {
      updates[test] = value * 0.5; // Secondary tests get lower weight
    });
  } else if ('selected' in answer && Array.isArray(answer.selected)) {
    // For element selection, use selected elements
    for (const elementId of answer.selected) {
      const element = scene.elements.find((e) => e.id === elementId);
      if (element) {
        updates[element.tag_ref] = 75; // Default positive score for selected
      }
    }
  }
  
  return updates;
}

/**
 * Calculate running average for test scores
 */
function updateRunningAverage(
  current: number | undefined,
  newValue: number,
  weight: number = 0.3
): number {
  if (current === undefined) {
    return newValue;
  }
  // Exponential moving average
  return current * (1 - weight) + newValue * weight;
}

/**
 * Detect correlations based on accumulated signals
 */
export function detectCorrelations(
  signals: Record<string, number>,
  sceneCorrelations: { positive: string[]; negative: string[] }
): string[] {
  const detected: string[] = [];

  // Check if signals suggest positive correlations
  sceneCorrelations.positive?.forEach((correlation) => {
    // Simple heuristic: if multiple related signals are positive, add correlation
    const relatedSignals = Object.entries(signals).filter(([key]) =>
      key.toLowerCase().includes(correlation.toLowerCase().split('_')[0])
    );

    if (relatedSignals.length >= 2) {
      const avgValue = relatedSignals.reduce((sum, [, v]) => sum + v, 0) / relatedSignals.length;
      if (avgValue > 1.5) {
        detected.push(correlation);
      }
    }
  });

  return [...new Set(detected)]; // Remove duplicates
}

/**
 * Update psychological profile in database
 */
export async function updatePsychologicalProfile(
  supabase: SupabaseClient,
  userId: string,
  signalUpdates: SignalUpdate[],
  testScoreUpdates: Record<string, number>,
  scene: SceneV2
): Promise<void> {
  // Fetch current profile
  const { data: profile } = await supabase
    .from('psychological_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const currentSignals: Record<string, number> = profile?.profile_signals || {};
  const currentTests: Record<string, number> = profile?.test_scores || {};
  const currentCorrelations: string[] = profile?.correlations_detected || [];

  // Update signal counts
  for (const update of signalUpdates) {
    currentSignals[update.signal] = (currentSignals[update.signal] || 0) + update.weight;
  }

  // Update test scores with running average
  for (const [test, value] of Object.entries(testScoreUpdates)) {
    currentTests[test] = updateRunningAverage(currentTests[test], value);
  }

  // Detect new correlations
  const correlations = (scene.ai_context as any)?.correlations;
  if (correlations) {
    const newCorrelations = detectCorrelations(currentSignals, correlations);
    for (const corr of newCorrelations) {
      if (!currentCorrelations.includes(corr)) {
        currentCorrelations.push(corr);
      }
    }
  }

  // Upsert profile
  await supabase.from('psychological_profiles').upsert(
    {
      user_id: userId,
      profile_signals: currentSignals,
      test_scores: currentTests,
      correlations_detected: currentCorrelations,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );
}

/**
 * Add a follow-up signal to the profile
 */
export async function addFollowUpSignal(
  supabase: SupabaseClient,
  userId: string,
  signal: string
): Promise<void> {
  const { data: profile } = await supabase
    .from('psychological_profiles')
    .select('profile_signals')
    .eq('user_id', userId)
    .single();

  const signals: Record<string, number> = profile?.profile_signals || {};
  signals[signal] = (signals[signal] || 0) + 1.5; // Follow-up answers are weighted more

  await supabase.from('psychological_profiles').upsert(
    {
      user_id: userId,
      profile_signals: signals,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id',
    }
  );
}

/**
 * Get user's psychological profile
 */
export async function getPsychologicalProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<PsychologicalProfile | null> {
  const { data } = await supabase
    .from('psychological_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data;
}

/**
 * Get top signals from profile (for recommendations)
 */
export function getTopSignals(
  profile: PsychologicalProfile,
  limit: number = 10
): Array<{ signal: string; weight: number }> {
  const signals = Object.entries(profile.profile_signals)
    .map(([signal, weight]) => ({ signal, weight }))
    .sort((a, b) => b.weight - a.weight);

  return signals.slice(0, limit);
}

/**
 * Get top test scores from profile
 */
export function getTopTestScores(
  profile: PsychologicalProfile,
  limit: number = 10
): Array<{ test: string; score: number }> {
  const tests = Object.entries(profile.test_scores)
    .map(([test, score]) => ({ test, score }))
    .sort((a, b) => b.score - a.score);

  return tests.slice(0, limit);
}

// ============================================
// BODY MAP SIGNAL CALCULATIONS
// ============================================

// Sensitive zones that get special signal tracking
const SENSITIVE_ZONES: BodyZoneId[] = [
  'anus',
  'feet',
  'nipples',
  'testicles',
  'clitoris',
  'nape',
  'ears',
  'inner_thighs',
];

/**
 * Check if answer is a BodyMapAnswer
 */
export function isBodyMapAnswer(answer: Answer): answer is BodyMapAnswer {
  return 'passes' in answer && Array.isArray((answer as BodyMapAnswer).passes);
}

/**
 * Calculate signals from a body map answer
 */
export function calculateBodyMapSignals(
  answer: BodyMapAnswer,
  scene: SceneV2
): SignalUpdate[] {
  const signals: SignalUpdate[] = [];

  for (const pass of answer.passes) {
    const { action, subject, markings } = pass;

    // Count preferences
    const loveCount = markings.filter((m) => m.preference === 'love').length;
    const sometimesCount = markings.filter((m) => m.preference === 'sometimes').length;
    const noCount = markings.filter((m) => m.preference === 'no').length;

    // Enthusiast signal if many "love" markings
    if (loveCount >= 5) {
      signals.push({
        signal: `${action}_enthusiast_${subject}`,
        weight: 1.0 + loveCount * 0.1,
      });
    }

    // Action-specific signals based on total positive markings
    if (loveCount + sometimesCount >= 3) {
      signals.push({
        signal: `enjoys_${action}_${subject}`,
        weight: 0.8 + (loveCount * 0.1),
      });
    }

    // Aversion signal if many "no" markings
    if (noCount >= 10) {
      signals.push({
        signal: `${action}_averse_${subject}`,
        weight: 0.5 + noCount * 0.05,
      });
    }

    // Track sensitive zone preferences
    for (const marking of markings) {
      if (SENSITIVE_ZONES.includes(marking.zoneId)) {
        if (marking.preference === 'love') {
          signals.push({
            signal: `${marking.zoneId}_${action}_${subject}_positive`,
            weight: 1.5,
          });
        } else if (marking.preference === 'no') {
          signals.push({
            signal: `${marking.zoneId}_${action}_${subject}_negative`,
            weight: -1.0,
          });
        }
      }

      // General zone preference tracking
      if (marking.preference === 'love') {
        signals.push({
          signal: `zone_${marking.zoneId}_${subject}_love`,
          weight: 0.5,
        });
      }
    }

    // Pattern detection signals
    const genitalsLove = markings.filter(
      (m) =>
        m.preference === 'love' &&
        ['penis', 'testicles', 'vulva', 'clitoris'].includes(m.zoneId)
    ).length;
    if (genitalsLove >= 2) {
      signals.push({
        signal: `genital_${action}_focused_${subject}`,
        weight: 1.2,
      });
    }

    // Intimate touch preference
    const intimateZonesLove = markings.filter(
      (m) =>
        m.preference === 'love' &&
        ['neck', 'ears', 'inner_thighs', 'belly', 'lower_back'].includes(m.zoneId)
    ).length;
    if (intimateZonesLove >= 3) {
      signals.push({
        signal: `sensual_${action}_preference_${subject}`,
        weight: 1.0,
      });
    }
  }

  return signals;
}

/**
 * Calculate body map test scores
 */
export function calculateBodyMapTestScores(
  answer: BodyMapAnswer,
  scene: SceneV2
): Record<string, number> {
  const scores: Record<string, number> = {};
  // V2 uses tests_primary and tests_secondary

  // Calculate overall engagement score based on total markings
  let totalLove = 0;
  let totalSometimes = 0;
  let totalNo = 0;

  for (const pass of answer.passes) {
    totalLove += pass.markings.filter((m) => m.preference === 'love').length;
    totalSometimes += pass.markings.filter((m) => m.preference === 'sometimes').length;
    totalNo += pass.markings.filter((m) => m.preference === 'no').length;
  }

  const totalMarkings = totalLove + totalSometimes + totalNo;
  if (totalMarkings > 0) {
    // Normalized engagement score (0-100)
    const engagementScore = ((totalLove * 1.0 + totalSometimes * 0.5) / totalMarkings) * 100;

    scene.ai_context.tests_primary?.forEach((test) => {
      scores[test] = engagementScore;
    });

    scene.ai_context.tests_secondary?.forEach((test) => {
      scores[test] = engagementScore * 0.7;
    });
  }

  return scores;
}

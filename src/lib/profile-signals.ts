import type {
  SceneV2,
  SignalUpdate,
  PsychologicalProfile,
} from './types';
import { db } from '@/lib/db';
import type { Json } from '@/lib/db/schema';
import {
  detectCorrelations,
  updateRunningAverage,
} from './profile-signals-pure';

// Re-export pure helpers for server-side callers (backward compat).
// Client-side code MUST import from `profile-signals-pure` directly to avoid
// pulling the server-only `db` module into the browser bundle.
export * from './profile-signals-pure';

/**
 * Update psychological profile in database
 */
export async function updatePsychologicalProfile(
  userId: string,
  signalUpdates: SignalUpdate[],
  testScoreUpdates: Record<string, number>,
  scene: SceneV2
): Promise<void> {
  // Fetch current profile
  const profile = await db
    .selectFrom('psychological_profiles')
    .selectAll()
    .where('user_id', '=', userId)
    .executeTakeFirst();

  const currentSignals: Record<string, number> =
    (profile?.profile_signals as Record<string, number> | null) ?? {};
  const currentTests: Record<string, number> =
    (profile?.test_scores as Record<string, number> | null) ?? {};
  const currentCorrelations: string[] =
    (profile?.correlations_detected as string[] | null) ?? [];

  // Update signal counts
  for (const update of signalUpdates) {
    currentSignals[update.signal] = (currentSignals[update.signal] || 0) + update.weight;
  }

  // Update test scores with running average
  for (const [test, value] of Object.entries(testScoreUpdates)) {
    currentTests[test] = updateRunningAverage(currentTests[test], value);
  }

  // Detect new correlations
  const correlations = (scene.ai_context as { correlations?: { positive: string[]; negative: string[] } } | undefined)?.correlations;
  if (correlations) {
    const newCorrelations = detectCorrelations(currentSignals, correlations);
    for (const corr of newCorrelations) {
      if (!currentCorrelations.includes(corr)) {
        currentCorrelations.push(corr);
      }
    }
  }

  // Upsert profile
  await db
    .insertInto('psychological_profiles')
    .values({
      user_id: userId,
      profile_signals: currentSignals as Json,
      test_scores: currentTests as Json,
      correlations_detected: currentCorrelations as Json,
      updated_at: new Date(),
    })
    .onConflict((oc) =>
      oc.columns(['user_id']).doUpdateSet({
        profile_signals: currentSignals as Json,
        test_scores: currentTests as Json,
        correlations_detected: currentCorrelations as Json,
        updated_at: new Date(),
      })
    )
    .execute();
}

/**
 * Add a follow-up signal to the profile
 */
export async function addFollowUpSignal(
  userId: string,
  signal: string
): Promise<void> {
  const profile = await db
    .selectFrom('psychological_profiles')
    .select('profile_signals')
    .where('user_id', '=', userId)
    .executeTakeFirst();

  const signals: Record<string, number> =
    (profile?.profile_signals as Record<string, number> | null) ?? {};
  signals[signal] = (signals[signal] || 0) + 1.5; // Follow-up answers are weighted more

  await db
    .insertInto('psychological_profiles')
    .values({
      user_id: userId,
      profile_signals: signals as Json,
      updated_at: new Date(),
    })
    .onConflict((oc) =>
      oc.columns(['user_id']).doUpdateSet({
        profile_signals: signals as Json,
        updated_at: new Date(),
      })
    )
    .execute();
}

/**
 * Get user's psychological profile
 */
export async function getPsychologicalProfile(
  userId: string
): Promise<PsychologicalProfile | null> {
  const row = await db
    .selectFrom('psychological_profiles')
    .selectAll()
    .where('user_id', '=', userId)
    .executeTakeFirst();

  return (row as unknown as PsychologicalProfile | undefined) ?? null;
}

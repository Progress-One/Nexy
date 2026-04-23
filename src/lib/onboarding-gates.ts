/**
 * Gates System - scene visibility based on user preferences
 *
 * ARCHITECTURE (as of migration 033_unified_responses.sql):
 * - Gates are computed AUTOMATICALLY by database triggers
 * - Single source of truth: user_gates.gates column
 * - Client should NOT compute gates - only read them from DB
 *
 * Sources:
 * - scene_responses (for scenes with sets_gate) → onboarding gates
 * - body_map_responses → body map gates
 * - activity_gates → manual/programmatic gates
 *
 * Response values:
 * - NO = 0: Not interested
 * - YES = 1: Interested
 * - VERY = 2: Very interested (unlocks advanced scenes)
 *
 * Usage:
 *   // Fetch gates from database (server-side only!)
 *   const gates = await fetchUserGates(userId);
 *   // Check scene access (pure — safe for client bundles)
 *   const allowed = isSceneAllowed('blowjob', gates);
 *
 * NOTE: Pure helpers (constants, types, isSceneAllowed, etc.) live in
 * `onboarding-gates-pure.ts`. Client-side code (hooks, components marked
 * `'use client'`) MUST import from `onboarding-gates-pure` to avoid pulling
 * the server-only `db` module into the browser bundle.
 */

import { db } from '@/lib/db';
import type { OnboardingGates } from './onboarding-gates-pure';

// Re-export all pure helpers for server-side callers (backward compat).
// Client-side code must import from `onboarding-gates-pure` directly.
export * from './onboarding-gates-pure';

// ============================================
// DATABASE FUNCTIONS (preferred)
// ============================================

/**
 * Fetch user gates from database (single source of truth)
 * Gates are auto-computed by triggers - no client computation needed
 */
export async function fetchUserGates(
  userId: string
): Promise<OnboardingGates> {
  const row = await db
    .selectFrom('user_gates')
    .select('gates')
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!row) {
    console.warn('No gates found for user:', userId);
    return {};
  }

  return (row.gates as OnboardingGates) ?? {};
}

/**
 * Fetch full gate details from database (for debugging)
 */
export async function fetchUserGatesDetailed(
  userId: string
): Promise<{
  gates: OnboardingGates;
  onboarding_gates: OnboardingGates;
  body_map_gates: Record<string, boolean>;
} | null> {
  const row = await db
    .selectFrom('user_gates')
    .select(['gates', 'onboarding_gates', 'body_map_gates'])
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  return {
    gates: (row.gates as OnboardingGates) ?? {},
    onboarding_gates: (row.onboarding_gates as OnboardingGates) ?? {},
    body_map_gates: (row.body_map_gates as Record<string, boolean>) ?? {},
  };
}

// REMOVED: getVisibleOnboardingCategories - conditional logic was unused

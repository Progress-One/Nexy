import type { Scene, Proposal } from './types';

export interface ProposalWithScene {
  proposal: Proposal;
  scene: Scene;
}

/**
 * Fetch pending proposals for the current user, joined with scene data.
 * Filters out proposals for scenes the user already answered.
 *
 * Migrated from a direct .from(...) query to a typed server endpoint
 * (`GET /api/proposals/pending`) — Phase 4b.
 */
export async function fetchPendingProposals(
  // _supabase is no longer used; signature kept for backward-compatible call sites.
  _supabase: unknown,
  _userId: string,
): Promise<ProposalWithScene[]> {
  try {
    const res = await fetch('/api/proposals/pending');
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: ProposalWithScene[] };
    return json.items ?? [];
  } catch (err) {
    console.error('[proposals] fetch pending failed:', err);
    return [];
  }
}

/**
 * Update proposal status (pending → shown, shown → answered).
 *
 * Migrated to `PATCH /api/proposals` — server enforces authorization.
 */
export async function updateProposalStatus(
  _supabase: unknown,
  proposalId: string,
  status: 'shown' | 'answered',
): Promise<void> {
  try {
    const res = await fetch('/api/proposals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: proposalId, status }),
    });
    if (!res.ok) {
      console.error('[proposals] failed to update status', proposalId, res.status);
    }
  } catch (err) {
    console.error('[proposals] failed to update status', err);
  }
}

import type { createClient } from '@/lib/http-client/client';
import type { Scene, Proposal } from './types';

type BrowserClient = ReturnType<typeof createClient>;

export interface ProposalWithScene {
  proposal: Proposal;
  scene: Scene;
}

/**
 * Fetch pending proposals for the current user, joined with scene data.
 * Filters out proposals for scenes the user already answered.
 */
export async function fetchPendingProposals(
  supabase: BrowserClient,
  userId: string
): Promise<ProposalWithScene[]> {
  // 1. Get pending proposals (RLS ensures only to_user_id can SELECT)
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !proposals || proposals.length === 0) {
    return [];
  }

  // 2. Collect scene IDs
  const sceneIds = proposals
    .map((p: Proposal) => p.scene_id)
    .filter((id): id is string => Boolean(id));

  if (sceneIds.length === 0) return [];

  // 3. Fetch actual scenes (only active V2)
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .in('id', sceneIds)
    .eq('is_active', true)
    .eq('version', 2);

  if (!scenes || scenes.length === 0) return [];

  const sceneMap = new Map(scenes.map((s: Scene) => [s.id, s]));

  // 4. Filter out already-answered scenes
  const { data: answered } = await supabase
    .from('scene_responses')
    .select('scene_id')
    .eq('user_id', userId)
    .in('scene_id', sceneIds);

  const answeredIds = new Set(answered?.map((a: { scene_id: string }) => a.scene_id) || []);

  // 5. Combine proposals with scenes
  const result: ProposalWithScene[] = [];
  for (const proposal of proposals as Proposal[]) {
    if (!proposal.scene_id) continue;
    if (answeredIds.has(proposal.scene_id)) continue;
    const scene = sceneMap.get(proposal.scene_id);
    if (!scene) continue;
    result.push({ proposal, scene: scene as Scene });
  }

  return result;
}

/**
 * Update proposal status (pending → shown, shown → answered).
 */
export async function updateProposalStatus(
  supabase: BrowserClient,
  proposalId: string,
  status: 'shown' | 'answered'
): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .update({ status })
    .eq('id', proposalId);

  if (error) {
    console.error('[proposals] Failed to update status:', error);
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Scene, Proposal } from '@/lib/types';

/**
 * Returns pending proposals addressed to the current user, joined with the
 * referenced scenes, and filtered to exclude scenes the caller has already
 * answered. Used by useDiscovery to inject proposals into the swipe queue.
 *
 * Shape: { items: Array<{ proposal, scene }> }
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const proposals = await db
    .selectFrom('proposals')
    .selectAll()
    .where('to_user_id', '=', user.id)
    .where('status', '=', 'pending')
    .orderBy('created_at', 'asc')
    .execute();

  if (proposals.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const sceneIds = proposals
    .map((p) => p.scene_id)
    .filter((id): id is string => Boolean(id));
  if (sceneIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const [scenes, answered] = await Promise.all([
    db
      .selectFrom('scenes')
      .selectAll()
      .where('id', 'in', sceneIds)
      .where('is_active', '=', true)
      .where('version', '=', 2)
      .execute(),
    db
      .selectFrom('scene_responses')
      .select(['scene_id'])
      .where('user_id', '=', user.id)
      .where('scene_id', 'in', sceneIds)
      .execute(),
  ]);

  const sceneMap = new Map(
    (scenes as unknown as Scene[]).map((s) => [s.id, s]),
  );
  const answeredIds = new Set(
    answered.map((a) => a.scene_id).filter((x): x is string => Boolean(x)),
  );

  const items: Array<{ proposal: Proposal; scene: Scene }> = [];
  for (const p of proposals) {
    if (!p.scene_id || answeredIds.has(p.scene_id)) continue;
    const scene = sceneMap.get(p.scene_id);
    if (!scene) continue;
    items.push({ proposal: p as unknown as Proposal, scene });
  }

  return NextResponse.json({ items });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Scene } from '@/lib/types';

/**
 * Compute date results: scenes where both users answered, classified into
 * `bothYes` (both said 'yes') and `bothMaybe` (no 'no' from either side, at
 * least one 'maybe').
 *
 * Caller must be a partnership member.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: dateId } = await ctx.params;
  if (!dateId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const dateRow = await db
    .selectFrom('dates')
    .select(['id', 'partnership_id'])
    .where('id', '=', dateId)
    .executeTakeFirst();
  if (!dateRow || !dateRow.partnership_id) {
    return NextResponse.json({ error: 'date not found' }, { status: 404 });
  }
  const partnership = await db
    .selectFrom('partnerships')
    .select(['user_id', 'partner_id', 'nickname'])
    .where('id', '=', dateRow.partnership_id)
    .executeTakeFirst();
  if (!partnership) {
    return NextResponse.json({ error: 'partnership not found' }, { status: 404 });
  }
  if (partnership.user_id !== user.id && partnership.partner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const partnerName = partnership.nickname || 'Партнёр';

  const responses = await db
    .selectFrom('date_responses')
    .select(['user_id', 'scene_id', 'answer'])
    .where('date_id', '=', dateId)
    .execute();

  const userIds = new Set(responses.map((r) => r.user_id));
  if (userIds.size < 2) {
    return NextResponse.json({
      waitingForPartner: true,
      partnerName,
      bothYes: [],
      bothMaybe: [],
    });
  }

  // Group answers by scene
  const byScene = new Map<string, Map<string, string>>();
  for (const r of responses) {
    if (!r.scene_id || !r.user_id || !r.answer) continue;
    if (!byScene.has(r.scene_id)) byScene.set(r.scene_id, new Map());
    byScene.get(r.scene_id)!.set(r.user_id, r.answer);
  }

  // Fetch all scenes referenced (active V2 only)
  const sceneIds = Array.from(byScene.keys());
  let scenesById = new Map<string, Scene>();
  if (sceneIds.length > 0) {
    const sceneRows = await db
      .selectFrom('scenes')
      .selectAll()
      .where('id', 'in', sceneIds)
      .where('is_active', '=', true)
      .execute();
    scenesById = new Map(
      (sceneRows as unknown as Scene[]).map((s) => [s.id, s]),
    );
  }

  const bothYes: Scene[] = [];
  const bothMaybe: Scene[] = [];

  for (const [sceneId, answers] of byScene) {
    if (answers.size !== 2) continue;
    const values = Array.from(answers.values());
    const scene = scenesById.get(sceneId);
    if (!scene) continue;

    if (values.every((a) => a === 'yes')) {
      bothYes.push(scene);
    } else if (values.every((a) => a === 'yes' || a === 'maybe')) {
      bothMaybe.push(scene);
    }
  }

  return NextResponse.json({
    waitingForPartner: false,
    partnerName,
    bothYes,
    bothMaybe,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'kysely';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getAdaptiveScenes } from '@/lib/scene-progression';
import type { Scene, SceneV2 } from '@/lib/types';

type Options = {
  maxIntensity?: number;
  limit?: number;
  orderByPriority?: boolean;
  enableAdaptiveFlow?: boolean;
  enableDedupe?: boolean;
  userGender?: 'male' | 'female';
};

function isUuid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const body = (await req.json().catch(() => ({}))) as { options?: Options };
  const options = body.options ?? {};
  const {
    maxIntensity = 5,
    limit = 10,
    orderByPriority = false,
    enableAdaptiveFlow = true,
    enableDedupe = true,
    userGender,
  } = options;

  // ---- Excluded scene IDs via RPC (best-effort) ----
  let excludedIds: string[] = [];
  try {
    const rpcRows = await sql<{ get_excluded_scene_ids: string }>`
      SELECT get_excluded_scene_ids(${userId}::uuid) AS get_excluded_scene_ids
    `.execute(db);
    excludedIds = (rpcRows.rows || [])
      .map((row) => row.get_excluded_scene_ids)
      .filter((id): id is string => typeof id === 'string');
  } catch {
    // Non-blocking fallback
    excludedIds = [];
  }

  // ---- Seen scene IDs (exclude body_map virtual scenes and body_map type) ----
  const seen = await db
    .selectFrom('scene_responses')
    .select(['scene_id', 'question_type'])
    .where('user_id', '=', userId)
    .execute();

  const seenIds: string[] = seen
    .filter((s) => {
      if (typeof s.scene_id === 'string' && s.scene_id.includes('bodymap-')) return false;
      if (s.question_type === 'body_map') return false;
      return true;
    })
    .map((s) => s.scene_id)
    .filter(isUuid);

  const validExcludedIds = excludedIds.filter(isUuid);

  // ---- Paired scene IDs (exclude the pair of any seen scene) ----
  let pairedIds: string[] = [];
  if (seenIds.length > 0) {
    const pairedScenes = await db
      .selectFrom('scenes')
      .select('paired_scene')
      .where('id', 'in', seenIds)
      .where('paired_scene', 'is not', null)
      .execute();

    const pairedSlugs = pairedScenes
      .map((s) => s.paired_scene)
      .filter((slug): slug is string => Boolean(slug));

    if (pairedSlugs.length > 0) {
      const rows = await db
        .selectFrom('scenes')
        .select('id')
        .where('slug', 'in', pairedSlugs)
        .execute();
      pairedIds = rows.map((r) => r.id).filter(isUuid);
    }
  }

  const allExcluded = [...validExcludedIds, ...seenIds, ...pairedIds];

  // ---- Fetch candidate scenes ----
  let query = db
    .selectFrom('scenes')
    .selectAll()
    .where('version', '=', 2)
    .where('is_active', '=', true)
    .where('clarification_for', 'is', null)
    .where('intensity', '<=', maxIntensity);

  if (userGender) {
    const gender = userGender;
    query = query.where((eb) =>
      eb.or([
        eb('for_gender', '=', gender),
        eb('for_gender', 'is', null),
      ])
    );
  }

  if (allExcluded.length > 0) {
    query = query.where('id', 'not in', allExcluded);
  }

  if (!enableAdaptiveFlow) {
    if (orderByPriority) {
      query = query
        .orderBy('priority', 'asc')
        .orderBy('created_at', 'desc');
    } else {
      query = query.orderBy('created_at', 'desc');
    }
    query = query.limit(limit);
  }

  let data: Scene[] = [];
  try {
    const rows = await query.execute();
    data = rows as unknown as Scene[];
  } catch (err) {
    console.error('[api/discovery/scenes] Error fetching scenes:', err);
    return NextResponse.json({ scenes: [] });
  }

  if (data.length === 0) {
    return NextResponse.json({ scenes: [] });
  }

  if (enableAdaptiveFlow) {
    const adaptive = await getAdaptiveScenes(userId, data, {
      maxIntensity,
      limit,
      enableDedupe,
      enableAdaptiveScoring: true,
    });

    if (adaptive.length === 0 && data.length > 0) {
      // Fallback to priority-based sorting
      const v2Scenes = (data as unknown as SceneV2[]).filter(
        (s) => s.version === 2 && Array.isArray(s.elements)
      );
      const sorted = [...v2Scenes].sort((a, b) => {
        const pa = a.priority || 50;
        const pb = b.priority || 50;
        return pa - pb;
      });
      return NextResponse.json({ scenes: sorted.slice(0, limit) });
    }

    return NextResponse.json({ scenes: adaptive });
  }

  return NextResponse.json({ scenes: data });
}

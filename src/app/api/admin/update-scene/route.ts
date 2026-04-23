import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type UpdatableField =
  | 'user_description'
  | 'user_description_alt'
  | 'alt_for_gender'
  | 'priority'
  | 'prompt_instructions'
  | 'generation_prompt'
  | 'accepted'
  | 'is_active'
  | 'selected_variant_index'
  | 'elements'
  | 'question'
  | 'paired_scene'
  | 'role_direction';

const ALLOWED_FIELDS: UpdatableField[] = [
  'user_description',
  'user_description_alt',
  'alt_for_gender',
  'priority',
  'prompt_instructions',
  'generation_prompt',
  'accepted',
  'is_active',
  'selected_variant_index',
  'elements',
  'question',
  'paired_scene',
  'role_direction',
];

export async function POST(req: Request) {
  try {
    const { sceneId, slug, field, value } = await req.json();

    if ((!sceneId && !slug) || !field) {
      return NextResponse.json(
        { error: 'Missing sceneId/slug or field' },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated
    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: `Field ${field} not allowed` },
        { status: 400 }
      );
    }

    // Kysely needs a typed update object; runtime value is validated via ALLOWED_FIELDS
    const updateSet = { [field]: value };

    let query = db.updateTable('scenes').set(updateSet as never);

    if (sceneId) {
      query = query.where('id', '=', sceneId);
    } else {
      query = query.where('slug', '=', slug);
    }

    const rows = await query.returningAll().execute();

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    // Sync paired scene for accepted status
    const scene = rows[0];
    if (field === 'accepted' && scene.paired_scene) {
      await db
        .updateTable('scenes')
        .set({ accepted: value })
        .where('slug', '=', scene.paired_scene)
        .execute();
      console.log(`[UpdateScene] Synced accepted=${value} to paired scene ${scene.paired_scene}`);
    }

    return NextResponse.json({ success: true, data: scene });
  } catch (error) {
    console.error('[UpdateScene] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

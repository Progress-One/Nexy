import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { sceneId, slug, field, value } = await req.json();

    if ((!sceneId && !slug) || !field) {
      return NextResponse.json(
        { error: 'Missing sceneId/slug or field' },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = [
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
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: `Field ${field} not allowed` },
        { status: 400 }
      );
    }

    let query = supabase
      .from('scenes')
      .update({ [field]: value });

    if (sceneId) {
      query = query.eq('id', sceneId);
    } else {
      query = query.eq('slug', slug);
    }

    const { data, error } = await query.select('*, paired_scene');

    if (error) {
      console.error('[UpdateScene] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Scene not found' },
        { status: 404 }
      );
    }

    // Sync paired scene for accepted status
    const scene = data[0];
    if (field === 'accepted' && scene.paired_scene) {
      await supabase
        .from('scenes')
        .update({ accepted: value })
        .eq('slug', scene.paired_scene);
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

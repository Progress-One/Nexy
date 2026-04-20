import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch all scenes with prompts
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('id, slug, generation_prompt, image_prompt, ai_context, tags, role_direction, category')
      .order('slug');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format for export
    const exportData = {
      exported_at: new Date().toISOString(),
      total_scenes: scenes?.length || 0,
      scenes: scenes?.map(s => ({
        id: s.id,
        slug: s.slug,
        category: s.category,
        tags: s.tags,
        role_direction: s.role_direction,
        image_prompt: s.image_prompt,
        generation_prompt: s.generation_prompt,
        ai_context: s.ai_context,
      })),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="prompts-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[ExportPrompts] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

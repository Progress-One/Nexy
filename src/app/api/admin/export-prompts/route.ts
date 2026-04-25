import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Fetch all scenes with prompts
    const scenes = await db
      .selectFrom('scenes')
      .select(['id', 'slug', 'generation_prompt', 'image_prompt', 'ai_context', 'tags', 'role_direction', 'category'])
      .orderBy('slug')
      .execute();

    // Format for export
    const exportData = {
      exported_at: new Date().toISOString(),
      total_scenes: scenes.length,
      scenes: scenes.map(s => ({
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

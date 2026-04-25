import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ALL_V3_TEMPLATES, getTemplatesByGroup, V3SceneTemplate } from '@/lib/v3-scene-templates';
import type { Json } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';

/**
 * Create V3 scenes from templates
 *
 * POST body:
 * - groupId: string - create all templates from a specific group
 * - slugs: string[] - create specific templates by slug
 * - all: boolean - create all templates
 */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { groupId, slugs, all } = body;

    let templatesToCreate: V3SceneTemplate[] = [];

    if (all) {
      templatesToCreate = ALL_V3_TEMPLATES;
    } else if (groupId) {
      templatesToCreate = getTemplatesByGroup(groupId);
    } else if (slugs && Array.isArray(slugs)) {
      templatesToCreate = ALL_V3_TEMPLATES.filter(t => slugs.includes(t.slug));
    }

    if (templatesToCreate.length === 0) {
      return NextResponse.json(
        { error: 'No templates found to create' },
        { status: 400 }
      );
    }

    // Check which scenes already exist
    const existingSlugs = new Set<string>();
    const existingScenes = await db
      .selectFrom('scenes')
      .select('slug')
      .where('slug', 'in', templatesToCreate.map(t => t.slug))
      .execute();

    for (const scene of existingScenes) {
      if (scene.slug) existingSlugs.add(scene.slug);
    }

    // Filter out existing scenes
    const newTemplates = templatesToCreate.filter(t => !existingSlugs.has(t.slug));

    if (newTemplates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All scenes already exist',
        created: 0,
        skipped: templatesToCreate.length,
        existing: Array.from(existingSlugs),
      });
    }

    // Create scenes from templates
    const scenesToInsert = newTemplates.map(template => ({
      slug: template.slug,
      title: template.title as unknown as Json,
      category: template.category,
      intensity: template.intensity,
      is_active: template.is_active,
      version: 2,
      // Image generation fields
      image_prompt: template.image_prompt,
      generation_prompt: template.image_prompt, // Copy to editable field
      // V3 fields
      scene_type: template.scene_type,
      clarification_for: template.clarification_for || [],
      role_direction: template.role_direction || 'mutual',
      paired_scene: template.paired_scene || null, // Slug reference to paired scene
      // Descriptions (minimal for now)
      ai_description: template.title as unknown as Json,
      user_description: template.title as unknown as Json,
      // Default empty arrays/objects
      tags: [template.category, template.scene_type],
      elements: [] as unknown as Json,
      ai_context: {
        tests_primary: [template.slug],
        tests_secondary: [],
      } as unknown as Json,
    }));

    const insertedScenes = await db
      .insertInto('scenes')
      .values(scenesToInsert)
      .returning(['id', 'slug'])
      .execute();

    return NextResponse.json({
      success: true,
      created: insertedScenes.length,
      skipped: existingSlugs.size,
      scenes: insertedScenes.map(s => s.slug),
      existing: Array.from(existingSlugs),
    });
  } catch (error) {
    const err = error as Error;
    console.error('Create V3 scenes error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET - List available templates and their status
 */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Get all existing V3 template slugs
    const existingScenes = await db
      .selectFrom('scenes')
      .select(['slug', 'image_url', 'is_active'])
      .where('slug', 'in', ALL_V3_TEMPLATES.map(t => t.slug))
      .execute();

    const existingMap = new Map<string, { image_url: string | null; is_active: boolean }>();
    for (const scene of existingScenes) {
      if (scene.slug) {
        existingMap.set(scene.slug, {
          image_url: scene.image_url,
          is_active: scene.is_active ?? false,
        });
      }
    }

    // Build status for each template
    const templateStatus = ALL_V3_TEMPLATES.map(template => ({
      slug: template.slug,
      title: template.title,
      group: template.group,
      exists: existingMap.has(template.slug),
      hasImage: existingMap.get(template.slug)?.image_url ? true : false,
      isActive: existingMap.get(template.slug)?.is_active ?? false,
    }));

    return NextResponse.json({
      templates: templateStatus,
      summary: {
        total: ALL_V3_TEMPLATES.length,
        created: existingMap.size,
        withImages: templateStatus.filter(t => t.hasImage).length,
        missing: ALL_V3_TEMPLATES.length - existingMap.size,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get V3 templates error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

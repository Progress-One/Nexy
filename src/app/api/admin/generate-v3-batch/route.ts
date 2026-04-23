import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadToStorage, getStoragePublicUrl } from '@/lib/storage';
import { generateWithReplicate } from '@/lib/replicate';
import { ALL_V3_TEMPLATES, getTemplatesByGroup } from '@/lib/v3-scene-templates';

const DEFAULT_MODEL = 'black-forest-labs/flux-1.1-pro';
const DEFAULT_ASPECT_RATIO = '3:4';

/**
 * Generate images for V3 scenes in batch
 *
 * POST body:
 * - groupId: string - generate for specific group
 * - slugs: string[] - generate for specific scenes
 * - all: boolean - generate for all scenes without images
 * - modelId: string - Replicate model to use (optional)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { groupId, slugs, all, modelId = DEFAULT_MODEL } = body;

    // Get templates to generate
    let templates: typeof ALL_V3_TEMPLATES = [];
    if (all) {
      templates = ALL_V3_TEMPLATES;
    } else if (groupId) {
      templates = getTemplatesByGroup(groupId);
    } else if (slugs && Array.isArray(slugs)) {
      templates = ALL_V3_TEMPLATES.filter(t => slugs.includes(t.slug));
    }

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'No templates found' },
        { status: 400 }
      );
    }

    // Get existing scenes that need images
    const existingScenes = await db
      .selectFrom('scenes')
      .select(['id', 'slug', 'image_url'])
      .where('slug', 'in', templates.map(t => t.slug))
      .execute();

    const existingMap = new Map<string, { id: string; image_url: string | null }>();
    for (const scene of existingScenes) {
      if (scene.slug && scene.id) {
        existingMap.set(scene.slug, { id: scene.id, image_url: scene.image_url });
      }
    }

    // Filter to only scenes without images (or all if forced)
    const toGenerate = templates.filter(t => {
      const existing = existingMap.get(t.slug);
      return existing && !existing.image_url;
    });

    if (toGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All scenes already have images or don\'t exist in DB',
        generated: 0,
        skipped: templates.length,
      });
    }

    const results: Array<{ slug: string; success: boolean; imageUrl?: string; error?: string }> = [];

    // Generate images one by one
    for (const template of toGenerate) {
      const sceneId = existingMap.get(template.slug)?.id;
      if (!sceneId) continue;

      try {
        console.log(`[V3 Batch] Generating image for ${template.slug}...`);

        const imageUrl = await generateWithReplicate({
          prompt: template.image_prompt,
          negativePrompt: 'text, watermark, logo, ugly, deformed, blurry, low quality',
          modelId,
          width: 768,
          height: 1024,
          aspectRatio: DEFAULT_ASPECT_RATIO,
        });

        // Upload to storage
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());

        const fileName = `${sceneId}_${Date.now()}.webp`;

        try {
          await uploadToStorage('scenes', fileName, buffer, { contentType: 'image/webp' });
        } catch (uploadError) {
          throw new Error(`Upload failed: ${(uploadError as Error).message}`);
        }

        const publicUrl = getStoragePublicUrl('scenes', fileName);

        // Update scene with image URL
        try {
          await db
            .updateTable('scenes')
            .set({
              image_url: publicUrl,
              generation_prompt: template.image_prompt,
            })
            .where('id', '=', sceneId)
            .execute();
        } catch (updateError) {
          throw new Error(`Update failed: ${(updateError as Error).message}`);
        }

        results.push({
          slug: template.slug,
          success: true,
          imageUrl: publicUrl,
        });

        console.log(`[V3 Batch] Success: ${template.slug}`);

        // Small delay between generations to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        const err = error as Error;
        console.error(`[V3 Batch] Error generating ${template.slug}:`, err);
        results.push({
          slug: template.slug,
          success: false,
          error: err.message,
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      generated: successful,
      failed,
      skipped: templates.length - toGenerate.length,
      results,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[V3 Batch] Error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET - Check generation status for V3 scenes
 */
export async function GET() {
  try {
    const scenes = await db
      .selectFrom('scenes')
      .select(['slug', 'image_url'])
      .where('slug', 'in', ALL_V3_TEMPLATES.map(t => t.slug))
      .execute();

    const withImages = scenes.filter(s => s.image_url);
    const withoutImages = scenes.filter(s => !s.image_url);
    const notCreated = ALL_V3_TEMPLATES.filter(
      t => !scenes.some(s => s.slug === t.slug)
    );

    return NextResponse.json({
      total: ALL_V3_TEMPLATES.length,
      created: scenes.length,
      withImages: withImages.length,
      withoutImages: withoutImages.length,
      notCreated: notCreated.length,
      needsGeneration: withoutImages.map(s => s.slug),
      needsCreation: notCreated.map(t => t.slug),
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import * as fs from 'fs';
import * as path from 'path';
import { requireAdmin } from '@/lib/admin-auth';

interface V2Element {
  id: string;
  label: { en: string; ru: string };
  tag_ref: string;
  follow_ups?: Array<{
    id: string;
    type: string;
    question: { en: string; ru: string };
    config: Record<string, unknown>;
  }>;
}

interface V2SceneJSON {
  id: string;
  slug: string;
  version: number;
  role_direction?: 'm_to_f' | 'f_to_m' | 'mutual' | 'solo';
  title: { en: string; ru: string };
  subtitle?: { en: string; ru: string };
  ai_description: { en: string; ru: string };
  user_description?: { en: string; ru: string };
  image_prompt?: string;
  intensity: number;
  category: string;
  tags: string[];
  elements?: V2Element[];
  question?: {
    type: string;
    text: { en: string; ru: string };
    min_selections?: number;
    max_selections?: number;
  };
  ai_context: {
    tests_primary: string[];
    tests_secondary: string[];
  };
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  try {
    const scenesDir = path.join(process.cwd(), 'scenes', 'v2-ACTIVE-92-scenes', 'composite');

    if (!fs.existsSync(scenesDir)) {
      return NextResponse.json({ error: 'V2 composite scenes directory not found' }, { status: 404 });
    }

    const scenes: V2SceneJSON[] = [];

    // Recursively load all JSON files from composite directory
    function loadDir(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          loadDir(fullPath);
        } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
          try {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            scenes.push(content);
          } catch (e) {
            console.error(`Error loading ${fullPath}: ${e}`);
          }
        }
      }
    }

    loadDir(scenesDir);

    if (scenes.length === 0) {
      return NextResponse.json({ error: 'No V2 scene files found' }, { status: 404 });
    }

    let totalImported = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    for (const scene of scenes) {
      try {
        // Validate V2 format
        if (scene.version !== 2) {
          errors.push(`${scene.slug}: Not a V2 file (version: ${scene.version})`);
          totalErrors++;
          continue;
        }

        // Build AI description (English only, technical for AI matching)
        const aiTags = [
          scene.category,
          scene.role_direction,
          ...scene.ai_context.tests_primary,
          ...scene.ai_context.tests_secondary,
          ...scene.tags.slice(0, 5),
        ].filter(Boolean).join(', ');

        const dbScene = {
          slug: scene.slug,
          version: scene.version || 2,
          role_direction: scene.role_direction || 'mutual',
          title: scene.title,
          subtitle: scene.subtitle || { ru: '', en: '' },
          // ai_description - English only, technical tags for AI matching
          ai_description: {
            en: aiTags,
            ru: '', // AI uses English only
          },
          // user_description - multilingual, short action descriptions for users
          // Left empty for manual entry via admin panel (JSON's ai_description is too long/poetic)
          user_description: scene.user_description || { ru: '', en: '' },
          image_url: '',
          image_prompt: scene.image_prompt || '',
          // generation_prompt - original prompt for image generation
          generation_prompt: scene.image_prompt || '',
          intensity: scene.intensity,
          category: scene.category,
          tags: scene.tags,
          elements: scene.elements || [],
          question: scene.question || null,
          ai_context: scene.ai_context,
          // Legacy compatibility fields
          participants: { count: 2 },
          dimensions: scene.ai_context.tests_primary,
          relevant_for: { gender: 'any', interested_in: 'any' },
          priority: 50,
        };

        const { error } = await supabase
          .from('scenes')
          .upsert(dbScene, {
            onConflict: 'slug',
          });

        if (error) {
          errors.push(`${scene.slug}: ${error.message}`);
          totalErrors++;
        } else {
          totalImported++;
        }
      } catch (e) {
        errors.push(`${scene.slug}: ${(e as Error).message}`);
        totalErrors++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      errors: totalErrors,
      errorDetails: errors.slice(0, 20),
      totalScenes: scenes.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to check V2 import status
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  try {
    // Count V2 scenes
    const { count: v2Count } = await supabase
      .from('scenes')
      .select('*', { count: 'exact', head: true })
      .eq('version', 2);

    // Count total scenes
    const { count: totalCount } = await supabase
      .from('scenes')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      v2_scenes: v2Count || 0,
      total_scenes: totalCount || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

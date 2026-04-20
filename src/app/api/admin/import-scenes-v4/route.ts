import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-auth';
import * as fs from 'fs';
import * as path from 'path';

interface V4QuestionConfig {
  type: 'scale' | 'yes_maybe_no' | 'topic_drilldown' | 'what_appeals';
  topic_ref?: string;
  question: {
    en: string;
    ru: string;
  };
  show_experience?: boolean;
  context_options?: Array<{
    id: string;
    label: { en: string; ru: string };
  }>;
}

interface V4SceneJSON {
  id: string;
  priority: number;
  intensity: number;
  question_config: V4QuestionConfig;
  generation_prompt: string;
  user_description: {
    en: string;
    ru: string;
  };
  ai_context: Record<string, unknown>;
  participants: string[]; // Simplified to strings in V4
  dimensions: string[];
  tags: string[];
  relevant_for: {
    gender: string;
    interested_in: string;
  };
  follow_up?: Record<string, unknown> | null;
}

interface V4FileJSON {
  $schema?: string;
  version: number;
  range: string;
  categories: string[];
  scenes: V4SceneJSON[];
}

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  try {
    const scenesDir = path.join(process.cwd(), 'scenes', 'v4');

    if (!fs.existsSync(scenesDir)) {
      return NextResponse.json({ error: 'V4 scenes directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(scenesDir)
      .filter(f => f.startsWith('scenes-v4-') && f.endsWith('.json'))
      .sort();

    if (files.length === 0) {
      return NextResponse.json({ error: 'No V4 scene files found' }, { status: 404 });
    }

    let totalImported = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const file of files) {
      const filePath = path.join(scenesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed: V4FileJSON = JSON.parse(content);

      // Validate V4 format (accept 4, 4.0, "4", "4.0")
      const version = typeof parsed.version === 'string'
        ? parseFloat(parsed.version)
        : parsed.version;
      if (version < 4 || version >= 5) {
        errors.push(`${file}: Not a V4 file (version: ${parsed.version})`);
        totalSkipped++;
        continue;
      }

      const scenes: V4SceneJSON[] = parsed.scenes || [];

      for (const scene of scenes) {
        try {
          // Validate question_config exists
          if (!scene.question_config || !scene.question_config.type) {
            errors.push(`${scene.id}: Missing question_config`);
            totalErrors++;
            continue;
          }

          const dbScene = {
            slug: scene.id,
            priority: scene.priority,
            intensity: scene.intensity,
            description: scene.user_description?.ru || (scene.ai_context as { description?: string })?.description || '',
            generation_prompt: scene.generation_prompt,
            user_description: scene.user_description,
            ai_context: scene.ai_context,
            question_config: scene.question_config,
            schema_version: 4,
            // Convert string participants to the expected format for backward compatibility
            participants: scene.participants.map(p => ({
              role: 'equal',
              gender: 'any',
              action: p,
            })),
            dimensions: scene.dimensions,
            tags: scene.tags,
            relevant_for: scene.relevant_for,
            // Deprecated fields kept for backward compatibility
            question_type: scene.question_config.type === 'yes_maybe_no' ? 'boundary' : 'interest_scale',
            follow_up: scene.follow_up || null,
            image_url: '',
          };

          const { error } = await supabase
            .from('scenes')
            .upsert(dbScene, {
              onConflict: 'slug',
            });

          if (error) {
            errors.push(`${scene.id}: ${error.message}`);
            totalErrors++;
          } else {
            totalImported++;
          }
        } catch (e) {
          errors.push(`${scene.id}: ${(e as Error).message}`);
          totalErrors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      errors: totalErrors,
      skipped: totalSkipped,
      errorDetails: errors.slice(0, 20),
      files: files.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to check V4 import status
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = await createServiceClient();

  try {
    // Count V4 scenes
    const { count: v4Count } = await supabase
      .from('scenes')
      .select('*', { count: 'exact', head: true })
      .eq('schema_version', 4);

    // Count V3 scenes
    const { count: v3Count } = await supabase
      .from('scenes')
      .select('*', { count: 'exact', head: true })
      .or('schema_version.is.null,schema_version.eq.3');

    // Count total scenes
    const { count: totalCount } = await supabase
      .from('scenes')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      v4_scenes: v4Count || 0,
      v3_scenes: v3Count || 0,
      total_scenes: totalCount || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

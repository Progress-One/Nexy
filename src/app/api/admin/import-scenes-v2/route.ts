import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'kysely';
import type { Json } from '@/lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';

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
        if (scene.version !== 2) {
          errors.push(`${scene.slug}: Not a V2 file (version: ${scene.version})`);
          totalErrors++;
          continue;
        }

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
          title: scene.title as unknown as Json,
          subtitle: (scene.subtitle || { ru: '', en: '' }) as unknown as Json,
          ai_description: {
            en: aiTags,
            ru: '',
          } as unknown as Json,
          user_description: (scene.user_description || { ru: '', en: '' }) as unknown as Json,
          image_url: '',
          image_prompt: scene.image_prompt || '',
          generation_prompt: scene.image_prompt || '',
          intensity: scene.intensity,
          category: scene.category,
          tags: scene.tags,
          elements: (scene.elements || []) as unknown as Json,
          question: (scene.question || null) as unknown as Json,
          ai_context: scene.ai_context as unknown as Json,
          priority: 50,
        };

        try {
          await db
            .insertInto('scenes')
            .values(dbScene)
            .onConflict(oc => oc.column('slug').doUpdateSet({
              version: dbScene.version,
              role_direction: dbScene.role_direction,
              title: dbScene.title,
              subtitle: dbScene.subtitle,
              ai_description: dbScene.ai_description,
              user_description: dbScene.user_description,
              image_url: dbScene.image_url,
              image_prompt: dbScene.image_prompt,
              generation_prompt: dbScene.generation_prompt,
              intensity: dbScene.intensity,
              category: dbScene.category,
              tags: dbScene.tags,
              elements: dbScene.elements,
              question: dbScene.question,
              ai_context: dbScene.ai_context,
              priority: dbScene.priority,
            }))
            .execute();
          totalImported++;
        } catch (err) {
          errors.push(`${scene.slug}: ${(err as Error).message}`);
          totalErrors++;
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
  try {
    // Count V2 scenes
    const v2Row = await db
      .selectFrom('scenes')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('version', '=', 2)
      .executeTakeFirstOrThrow();

    // Count total scenes
    const totalRow = await db
      .selectFrom('scenes')
      .select(sql<number>`count(*)::int`.as('count'))
      .executeTakeFirstOrThrow();

    return NextResponse.json({
      v2_scenes: v2Row.count || 0,
      total_scenes: totalRow.count || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

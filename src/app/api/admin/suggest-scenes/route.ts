/**
 * API Route: Suggest scenes for an image
 * Uses LLaVA to analyze the image and matches against scenes in the database
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeImage, ImageAnalysis } from '@/lib/image-analyzer';
import { matchScenesToImage } from '@/lib/scene-matcher';
import { requireAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // 1. Analyze image with LLaVA
    console.log('[suggest-scenes] Analyzing image...');
    let analysis: ImageAnalysis;
    try {
      analysis = await analyzeImage(imageUrl);
    } catch (analyzeError) {
      console.error('[suggest-scenes] Image analysis failed:', analyzeError);
      return NextResponse.json(
        { error: `Image analysis failed: ${(analyzeError as Error).message}` },
        { status: 500 }
      );
    }

    // 2. Load all scenes from database
    let scenes;
    try {
      scenes = await db
        .selectFrom('scenes')
        .select(['id', 'slug', 'title', 'category', 'tags', 'ai_description', 'image_prompt'])
        .where('version', '>=', 2)
        .execute();
    } catch (dbError) {
      console.error('[suggest-scenes] Database error:', dbError);
      return NextResponse.json(
        { error: `Database error: ${(dbError as Error).message}` },
        { status: 500 }
      );
    }

    // 3. Match scenes to the image analysis
    console.log('[suggest-scenes] Matching against', scenes?.length || 0, 'scenes...');
    // scene-matcher expects arrays of Record<string, unknown>
    const suggestions = matchScenesToImage(analysis, (scenes || []) as unknown as Parameters<typeof matchScenesToImage>[1]);

    console.log('[suggest-scenes] Found', suggestions.length, 'matches, top 3:',
      suggestions.slice(0, 3).map(s => `${s.slug} (${s.score})`).join(', ')
    );

    return NextResponse.json({
      analysis,
      suggestions: suggestions.slice(0, 10),
    });
  } catch (error) {
    console.error('[suggest-scenes] Unexpected error:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

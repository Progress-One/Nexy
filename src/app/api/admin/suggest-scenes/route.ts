/**
 * API Route: Suggest scenes for an image
 * Uses LLaVA to analyze the image and matches against scenes in the database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { analyzeImage, ImageAnalysis } from '@/lib/image-analyzer';
import { matchScenesToImage, SceneSuggestion } from '@/lib/scene-matcher';

export async function POST(request: Request) {
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: scenes, error: dbError } = await supabase
      .from('scenes')
      .select('id, slug, title, category, tags, ai_description, image_prompt')
      .gte('version', 2);

    if (dbError) {
      console.error('[suggest-scenes] Database error:', dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 3. Match scenes to the image analysis
    console.log('[suggest-scenes] Matching against', scenes?.length || 0, 'scenes...');
    const suggestions = matchScenesToImage(analysis, scenes || []);

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

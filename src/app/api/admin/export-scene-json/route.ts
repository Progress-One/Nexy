import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/export-scene-json
 * Export scenes to JSON format
 * Body: { sceneIds: string[], format?: 'single' | 'array' }
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { sceneIds, format = 'array' } = body;

  if (!sceneIds || !Array.isArray(sceneIds) || sceneIds.length === 0) {
    return NextResponse.json({ error: 'sceneIds array is required' }, { status: 400 });
  }

  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('*')
    .in('id', sceneIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!scenes || scenes.length === 0) {
    return NextResponse.json({ error: 'No scenes found' }, { status: 404 });
  }

  // Transform to V2 JSON format
  const exported = scenes.map((scene) => ({
    id: scene.slug?.replace(/-/g, '_') || scene.id,
    slug: scene.slug,
    version: 2,
    role_direction: scene.role_direction || 'mutual',
    title: scene.title || { ru: '', en: '' },
    subtitle: scene.subtitle,
    ai_description: scene.ai_description || { ru: '', en: '' },
    user_description: scene.user_description,
    image_prompt: scene.image_prompt,
    intensity: scene.intensity || 3,
    category: scene.category,
    tags: scene.tags || [],
    elements: scene.elements || [],
    question: scene.question,
    ai_context: scene.ai_context || { tests_primary: [], tests_secondary: [] },
  }));

  if (format === 'single' && exported.length === 1) {
    return NextResponse.json(exported[0]);
  }

  return NextResponse.json({ scenes: exported });
}

/**
 * GET /api/admin/export-scene-json?slug=xxx
 * Export a single scene by slug
 */
export async function GET(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const id = searchParams.get('id');

  if (!slug && !id) {
    return NextResponse.json({ error: 'slug or id is required' }, { status: 400 });
  }

  let query = supabase.from('scenes').select('*');

  if (id) {
    query = query.eq('id', id);
  } else if (slug) {
    query = query.eq('slug', slug);
  }

  const { data: scene, error } = await query.single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!scene) {
    return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
  }

  // Transform to V2 JSON format
  const exported = {
    id: scene.slug?.replace(/-/g, '_') || scene.id,
    slug: scene.slug,
    version: 2,
    role_direction: scene.role_direction || 'mutual',
    title: scene.title || { ru: '', en: '' },
    subtitle: scene.subtitle,
    ai_description: scene.ai_description || { ru: '', en: '' },
    user_description: scene.user_description,
    image_prompt: scene.image_prompt,
    intensity: scene.intensity || 3,
    category: scene.category,
    tags: scene.tags || [],
    elements: scene.elements || [],
    question: scene.question,
    ai_context: scene.ai_context || { tests_primary: [], tests_secondary: [] },
  };

  return NextResponse.json(exported);
}

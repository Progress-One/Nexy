import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SCENE_GATES, ALL_GATES } from '@/lib/onboarding-gates';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    // Fetch all active scenes
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('id, slug, title, image_url, is_active, category')
      .eq('is_active', true)
      .order('slug');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build scene map
    const sceneMap = new Map(scenes?.map(s => [s.slug, s]) || []);

    // Build hierarchy by gate
    const hierarchy: Record<string, {
      gate: string;
      scenes: Array<{
        slug: string;
        title: { ru?: string; en?: string };
        image_url?: string;
        gates: string[];
        operator: string;
        level?: string;
        exists: boolean;
      }>;
    }> = {};

    // Initialize all gates
    for (const gate of ALL_GATES) {
      hierarchy[gate] = { gate, scenes: [] };
    }

    // Assign scenes to their PRIMARY gate (first in the list)
    for (const [slug, req] of Object.entries(SCENE_GATES)) {
      const primaryGate = req.gates[0];
      const scene = sceneMap.get(slug);

      hierarchy[primaryGate].scenes.push({
        slug,
        title: scene?.title || { ru: slug, en: slug },
        image_url: scene?.image_url,
        gates: req.gates,
        operator: req.operator,
        level: req.level,
        exists: !!scene,
      });
    }

    // Also track scenes without gates (ungated)
    const gatedSlugs = new Set(Object.keys(SCENE_GATES));
    const isGated = (slug: string): boolean => {
      if (gatedSlugs.has(slug)) return true;
      // Check base slug for -give/-receive variants
      if (slug.endsWith('-give') || slug.endsWith('-receive')) {
        const baseSlug = slug.replace(/-(give|receive)$/, '');
        return gatedSlugs.has(baseSlug);
      }
      return false;
    };
    const ungatedScenes = scenes?.filter(s => !isGated(s.slug)) || [];

    return NextResponse.json({
      gates: ALL_GATES,
      hierarchy,
      ungated: ungatedScenes.map(s => ({
        slug: s.slug,
        title: s.title,
        image_url: s.image_url,
        category: s.category,
      })),
      stats: {
        totalGated: Object.keys(SCENE_GATES).length,
        totalUngated: ungatedScenes.length,
        totalActive: scenes?.length || 0,
      },
    });
  } catch (error) {
    console.error('[GateHierarchy] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SCENE_GATES, ALL_GATES } from '@/lib/onboarding-gates';
import type { Json } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    // Fetch all active scenes
    const scenes = await db
      .selectFrom('scenes')
      .select(['id', 'slug', 'title', 'image_url', 'is_active', 'category'])
      .where('is_active', '=', true)
      .orderBy('slug')
      .execute();

    // Build scene map
    const sceneMap = new Map(scenes.map(s => [s.slug, s]));

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
      const titleObj = (scene?.title as { ru?: string; en?: string } | null) || { ru: slug, en: slug };

      hierarchy[primaryGate].scenes.push({
        slug,
        title: titleObj,
        image_url: scene?.image_url || undefined,
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
    const ungatedScenes = scenes.filter(s => s.slug && !isGated(s.slug));

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
        totalActive: scenes.length,
      },
    });
  } catch (error) {
    console.error('[GateHierarchy] Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

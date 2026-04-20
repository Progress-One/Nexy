import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { action, sceneIdA, sceneIdB } = await req.json();

    if (!sceneIdA || !sceneIdB) {
      return NextResponse.json({ error: 'Missing scene IDs' }, { status: 400 });
    }

    // Get both scenes
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('id, slug, image_url, image_variants')
      .in('id', [sceneIdA, sceneIdB]);

    if (error || !scenes || scenes.length !== 2) {
      return NextResponse.json({ error: 'Scenes not found' }, { status: 404 });
    }

    const sceneA = scenes.find(s => s.id === sceneIdA);
    const sceneB = scenes.find(s => s.id === sceneIdB);

    if (!sceneA || !sceneB) {
      return NextResponse.json({ error: 'Scenes not found' }, { status: 404 });
    }

    if (action === 'swap') {
      // Swap both image_url and image_variants between scenes
      const { error: updateError } = await supabase.rpc('swap_scene_images', {
        scene_id_a: sceneIdA,
        scene_id_b: sceneIdB
      }).maybeSingle();

      // If RPC doesn't exist, do it manually
      if (updateError) {
        console.log('[SwapImages] RPC not available, doing manual swap');

        // Update scene A with B's images
        await supabase
          .from('scenes')
          .update({
            image_url: sceneB.image_url,
            image_variants: sceneB.image_variants,
          })
          .eq('id', sceneIdA);

        // Update scene B with A's images
        await supabase
          .from('scenes')
          .update({
            image_url: sceneA.image_url,
            image_variants: sceneA.image_variants,
          })
          .eq('id', sceneIdB);
      }

      console.log(`[SwapImages] Swapped images between ${sceneA.slug} and ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Images swapped',
      });
    }

    if (action === 'copy_a_to_b') {
      // Copy A's images to B
      await supabase
        .from('scenes')
        .update({
          image_url: sceneA.image_url,
          image_variants: sceneA.image_variants,
        })
        .eq('id', sceneIdB);

      console.log(`[SwapImages] Copied images from ${sceneA.slug} to ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Images copied from A to B',
      });
    }

    if (action === 'copy_b_to_a') {
      // Copy B's images to A
      await supabase
        .from('scenes')
        .update({
          image_url: sceneB.image_url,
          image_variants: sceneB.image_variants,
        })
        .eq('id', sceneIdA);

      console.log(`[SwapImages] Copied images from ${sceneB.slug} to ${sceneA.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Images copied from B to A',
      });
    }

    if (action === 'clear_both') {
      // Clear all variants from both scenes
      await supabase
        .from('scenes')
        .update({ image_variants: [] })
        .eq('id', sceneIdA);

      await supabase
        .from('scenes')
        .update({ image_variants: [] })
        .eq('id', sceneIdB);

      console.log(`[SwapImages] Cleared variants from ${sceneA.slug} and ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Cleared all variants from both scenes',
      });
    }

    if (action === 'merge') {
      // Merge variants from both scenes (deduplicated by URL)
      const variantsA = sceneA.image_variants || [];
      const variantsB = sceneB.image_variants || [];

      const getBaseUrl = (url: string) => url?.split('?')[0] || '';
      const seenUrls = new Set<string>();
      const merged: any[] = [];

      for (const v of [...variantsA, ...variantsB]) {
        const baseUrl = getBaseUrl(v.url);
        if (!seenUrls.has(baseUrl) && !v.is_placeholder) {
          seenUrls.add(baseUrl);
          merged.push(v);
        }
      }

      // Update both scenes with merged variants
      await supabase
        .from('scenes')
        .update({ image_variants: merged })
        .eq('id', sceneIdA);

      await supabase
        .from('scenes')
        .update({ image_variants: merged })
        .eq('id', sceneIdB);

      console.log(`[SwapImages] Merged ${merged.length} variants between ${sceneA.slug} and ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: `Merged ${merged.length} variants`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[SwapImages] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET - Get pairs with different images
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('id, slug, role_direction, user_description, image_url, image_variants, shared_images_with')
      .eq('is_active', true)
      .or('slug.ilike.%-give,slug.ilike.%-receive')
      .order('slug');

    // Build a map of scene IDs to their variants (for shared_images_with lookup)
    const allSceneIds = new Set<string>();
    for (const s of scenes || []) {
      if (s.shared_images_with) {
        allSceneIds.add(s.shared_images_with);
      }
    }

    // Fetch shared source scenes
    let sharedSourceMap: Record<string, any[]> = {};
    if (allSceneIds.size > 0) {
      const { data: sharedSources } = await supabase
        .from('scenes')
        .select('id, image_variants')
        .in('id', Array.from(allSceneIds));

      for (const s of sharedSources || []) {
        sharedSourceMap[s.id] = s.image_variants || [];
      }
    }

    // Merge shared variants into scenes
    for (const s of scenes || []) {
      if (s.shared_images_with && sharedSourceMap[s.shared_images_with]) {
        const sharedVariants = sharedSourceMap[s.shared_images_with];
        const ownVariants = s.image_variants || [];
        // Combine (shared source variants take precedence for display)
        s.image_variants = sharedVariants.length > 0 ? sharedVariants : ownVariants;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by base slug
    const pairs: Record<string, any[]> = {};
    for (const s of scenes || []) {
      const baseSlug = s.slug.replace(/-(give|receive)$/, '');
      if (!pairs[baseSlug]) {
        pairs[baseSlug] = [];
      }
      pairs[baseSlug].push(s);
    }

    // Find pairs with different images
    const mismatchedPairs: Array<{
      baseSlug: string;
      give: any;
      receive: any;
      sameImage: boolean;
    }> = [];

    for (const [baseSlug, pair] of Object.entries(pairs)) {
      if (pair.length !== 2) continue;

      const give = pair.find(s => s.slug.endsWith('-give'));
      const receive = pair.find(s => s.slug.endsWith('-receive'));

      if (!give || !receive) continue;

      const sameImage = give.image_url === receive.image_url;

      mismatchedPairs.push({
        baseSlug,
        give: {
          ...give,
          sharedFrom: give.shared_images_with ? true : false,
        },
        receive: {
          ...receive,
          sharedFrom: receive.shared_images_with ? true : false,
        },
        sameImage,
      });
    }

    // Sort: mismatched first
    mismatchedPairs.sort((a, b) => {
      if (a.sameImage === b.sameImage) return a.baseSlug.localeCompare(b.baseSlug);
      return a.sameImage ? 1 : -1;
    });

    return NextResponse.json({ pairs: mismatchedPairs });
  } catch (error) {
    console.error('[SwapImages] GET Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

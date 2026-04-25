import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'kysely';
import type { Json } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';

interface ImageVariant {
  url: string;
  is_placeholder?: boolean;
  [key: string]: unknown;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { action, sceneIdA, sceneIdB } = await req.json();

    if (!sceneIdA || !sceneIdB) {
      return NextResponse.json({ error: 'Missing scene IDs' }, { status: 400 });
    }

    // Get both scenes
    const scenes = await db
      .selectFrom('scenes')
      .select(['id', 'slug', 'image_url', 'image_variants'])
      .where('id', 'in', [sceneIdA, sceneIdB])
      .execute();

    if (!scenes || scenes.length !== 2) {
      return NextResponse.json({ error: 'Scenes not found' }, { status: 404 });
    }

    const sceneA = scenes.find(s => s.id === sceneIdA);
    const sceneB = scenes.find(s => s.id === sceneIdB);

    if (!sceneA || !sceneB) {
      return NextResponse.json({ error: 'Scenes not found' }, { status: 404 });
    }

    if (action === 'swap') {
      // Try RPC; on failure fall back to manual swap
      try {
        await sql`SELECT swap_scene_images(${sceneIdA}::uuid, ${sceneIdB}::uuid)`.execute(db);
      } catch {
        console.log('[SwapImages] RPC not available, doing manual swap');

        await db
          .updateTable('scenes')
          .set({
            image_url: sceneB.image_url,
            image_variants: sceneB.image_variants,
          })
          .where('id', '=', sceneIdA)
          .execute();

        await db
          .updateTable('scenes')
          .set({
            image_url: sceneA.image_url,
            image_variants: sceneA.image_variants,
          })
          .where('id', '=', sceneIdB)
          .execute();
      }

      console.log(`[SwapImages] Swapped images between ${sceneA.slug} and ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Images swapped',
      });
    }

    if (action === 'copy_a_to_b') {
      await db
        .updateTable('scenes')
        .set({
          image_url: sceneA.image_url,
          image_variants: sceneA.image_variants,
        })
        .where('id', '=', sceneIdB)
        .execute();

      console.log(`[SwapImages] Copied images from ${sceneA.slug} to ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Images copied from A to B',
      });
    }

    if (action === 'copy_b_to_a') {
      await db
        .updateTable('scenes')
        .set({
          image_url: sceneB.image_url,
          image_variants: sceneB.image_variants,
        })
        .where('id', '=', sceneIdA)
        .execute();

      console.log(`[SwapImages] Copied images from ${sceneB.slug} to ${sceneA.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Images copied from B to A',
      });
    }

    if (action === 'clear_both') {
      await db
        .updateTable('scenes')
        .set({ image_variants: [] as unknown as Json })
        .where('id', '=', sceneIdA)
        .execute();

      await db
        .updateTable('scenes')
        .set({ image_variants: [] as unknown as Json })
        .where('id', '=', sceneIdB)
        .execute();

      console.log(`[SwapImages] Cleared variants from ${sceneA.slug} and ${sceneB.slug}`);

      return NextResponse.json({
        success: true,
        message: 'Cleared all variants from both scenes',
      });
    }

    if (action === 'merge') {
      const variantsA = (sceneA.image_variants as ImageVariant[]) || [];
      const variantsB = (sceneB.image_variants as ImageVariant[]) || [];

      const getBaseUrl = (url: string) => url?.split('?')[0] || '';
      const seenUrls = new Set<string>();
      const merged: ImageVariant[] = [];

      for (const v of [...variantsA, ...variantsB]) {
        const baseUrl = getBaseUrl(v.url as string);
        if (!seenUrls.has(baseUrl) && !v.is_placeholder) {
          seenUrls.add(baseUrl);
          merged.push(v);
        }
      }

      await db
        .updateTable('scenes')
        .set({ image_variants: merged as unknown as Json })
        .where('id', '=', sceneIdA)
        .execute();

      await db
        .updateTable('scenes')
        .set({ image_variants: merged as unknown as Json })
        .where('id', '=', sceneIdB)
        .execute();

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
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const scenes = await db
      .selectFrom('scenes')
      .select(['id', 'slug', 'role_direction', 'user_description', 'image_url', 'image_variants', 'shared_images_with'])
      .where('is_active', '=', true)
      .where(eb => eb.or([
        eb('slug', 'ilike', '%-give'),
        eb('slug', 'ilike', '%-receive'),
      ]))
      .orderBy('slug')
      .execute();

    // Build a map of scene IDs to their variants (for shared_images_with lookup)
    const allSceneIds = new Set<string>();
    for (const s of scenes) {
      if (s.shared_images_with) {
        allSceneIds.add(s.shared_images_with);
      }
    }

    // Fetch shared source scenes
    const sharedSourceMap: Record<string, ImageVariant[]> = {};
    if (allSceneIds.size > 0) {
      const sharedSources = await db
        .selectFrom('scenes')
        .select(['id', 'image_variants'])
        .where('id', 'in', Array.from(allSceneIds))
        .execute();

      for (const s of sharedSources) {
        if (s.id) sharedSourceMap[s.id] = (s.image_variants as ImageVariant[]) || [];
      }
    }

    // Build scene records for output (merged type)
    const outScenes = scenes.map(s => {
      let variants = (s.image_variants as ImageVariant[]) || [];
      if (s.shared_images_with && sharedSourceMap[s.shared_images_with]) {
        const sharedVariants = sharedSourceMap[s.shared_images_with];
        if (sharedVariants.length > 0) {
          variants = sharedVariants;
        }
      }
      return {
        id: s.id,
        slug: s.slug,
        role_direction: s.role_direction,
        user_description: s.user_description,
        image_url: s.image_url,
        image_variants: variants,
        shared_images_with: s.shared_images_with,
      };
    });

    // Group by base slug
    const pairs: Record<string, typeof outScenes> = {};
    for (const s of outScenes) {
      if (!s.slug) continue;
      const baseSlug = s.slug.replace(/-(give|receive)$/, '');
      if (!pairs[baseSlug]) {
        pairs[baseSlug] = [];
      }
      pairs[baseSlug].push(s);
    }

    const mismatchedPairs: Array<{
      baseSlug: string;
      give: unknown;
      receive: unknown;
      sameImage: boolean;
    }> = [];

    for (const [baseSlug, pair] of Object.entries(pairs)) {
      if (pair.length !== 2) continue;

      const give = pair.find(s => s.slug?.endsWith('-give'));
      const receive = pair.find(s => s.slug?.endsWith('-receive'));

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

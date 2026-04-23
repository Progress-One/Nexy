import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Json } from '@/lib/db/schema';

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
  qa_score?: number;
  is_placeholder?: boolean;
}

// Helper: resolve paired_scene slug to ID
async function resolvePairedSceneId(pairedSlug: string | null): Promise<string | null> {
  if (!pairedSlug) return null;
  const row = await db
    .selectFrom('scenes')
    .select('id')
    .where('slug', '=', pairedSlug)
    .executeTakeFirst();
  return row?.id || null;
}

// Sync image_variants to linked scenes (paired_scene and shared_images_with)
async function syncVariantsToLinkedScenes(
  sceneId: string,
  variants: ImageVariant[],
  pairedSceneSlug: string | null,
  sharedImagesWith: string | null
) {
  // Resolve paired_scene slug to ID
  const pairedId = await resolvePairedSceneId(pairedSceneSlug);

  // Direct links: paired_scene (resolved) and shared_images_with
  const linkedIds = [pairedId, sharedImagesWith].filter(Boolean) as string[];

  // Reverse links: scenes that have shared_images_with pointing to this scene
  const reverseLinked = await db
    .selectFrom('scenes')
    .select('id')
    .where('shared_images_with', '=', sceneId)
    .execute();

  for (const row of reverseLinked) {
    if (row.id) linkedIds.push(row.id);
  }

  const uniqueLinkedIds = [...new Set(linkedIds)];

  for (const linkedId of uniqueLinkedIds) {
    const linked = await db
      .selectFrom('scenes')
      .select('image_variants')
      .where('id', '=', linkedId)
      .executeTakeFirst();

    if (!linked) continue;

    const linkedVariants: ImageVariant[] = (linked.image_variants as unknown as ImageVariant[]) || [];
    const getBaseUrl = (url: string) => url?.split('?')[0] || '';
    const existingUrls = new Set(linkedVariants.map(v => getBaseUrl(v.url)));

    let updated = false;
    for (const v of variants) {
      if (!v.is_placeholder && !existingUrls.has(getBaseUrl(v.url))) {
        linkedVariants.push(v);
        updated = true;
      }
    }

    if (updated) {
      await db
        .updateTable('scenes')
        .set({ image_variants: linkedVariants as unknown as Json })
        .where('id', '=', linkedId)
        .execute();
      console.log(`[SaveVariant] Synced variants to linked scene ${linkedId}`);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sceneId, action, variantUrl, imageUrl, prompt } = body;

    if (!sceneId) {
      return NextResponse.json({ error: 'Missing sceneId' }, { status: 400 });
    }

    const scene = await db
      .selectFrom('scenes')
      .select(['image_url', 'generation_prompt', 'image_variants', 'qa_status', 'qa_last_assessment', 'paired_scene', 'shared_images_with'])
      .where('id', '=', sceneId)
      .executeTakeFirst();

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Action: save - Save specified image to variants
    if (action === 'save') {
      const urlToSave = imageUrl || scene.image_url;
      const promptToSave = prompt || scene.generation_prompt || '';

      if (!urlToSave) {
        return NextResponse.json({ error: 'No image to save' }, { status: 400 });
      }

      const currentVariants: ImageVariant[] = (scene.image_variants as unknown as ImageVariant[]) || [];

      console.log('[SaveVariant] Scene:', sceneId);
      console.log('[SaveVariant] Current variants in DB:', currentVariants.length);
      currentVariants.forEach((v, i) => console.log(`  [${i}] ${v.url?.substring(0, 60)}...`));
      console.log('[SaveVariant] URL to save:', urlToSave?.substring(0, 60) + '...');

      const getBaseUrl = (url: string) => url.split('?')[0];
      const baseUrlToSave = getBaseUrl(urlToSave);

      if (currentVariants.some(v => getBaseUrl(v.url) === baseUrlToSave)) {
        return NextResponse.json({
          success: true,
          message: 'Image already saved as variant',
          variants: currentVariants
        });
      }

      const newVariant: ImageVariant = {
        url: urlToSave,
        prompt: promptToSave,
        created_at: new Date().toISOString(),
        qa_status: (scene.qa_status as 'passed' | 'failed' | null) || null,
        qa_score: (scene.qa_last_assessment as { essenceScore?: number } | null)?.essenceScore,
      };

      const updatedVariants = [...currentVariants, newVariant];

      const updateData: { image_variants: Json; image_url?: string } = {
        image_variants: updatedVariants as unknown as Json,
      };
      if (!scene.image_url) {
        updateData.image_url = urlToSave;
        console.log('[SaveVariant] Also setting image_url (was empty)');
      }

      try {
        await db
          .updateTable('scenes')
          .set(updateData)
          .where('id', '=', sceneId)
          .execute();
      } catch (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
      }

      console.log('[SaveVariant] Saved! New total:', updatedVariants.length);

      await syncVariantsToLinkedScenes(
        sceneId,
        updatedVariants,
        scene.paired_scene,
        scene.shared_images_with
      );

      if (updateData.image_url) {
        const pairedId = await resolvePairedSceneId(scene.paired_scene);
        const linkedIds = [pairedId, scene.shared_images_with].filter(Boolean) as string[];
        for (const linkedId of linkedIds) {
          const linked = await db
            .selectFrom('scenes')
            .select('image_url')
            .where('id', '=', linkedId)
            .executeTakeFirst();

          if (linked && !linked.image_url) {
            await db
              .updateTable('scenes')
              .set({ image_url: updateData.image_url })
              .where('id', '=', linkedId)
              .execute();
            console.log(`[SaveVariant] Synced image_url to linked scene ${linkedId}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Image saved as variant',
        variants: updatedVariants,
      });
    }

    // Action: select - Select a variant as the main image
    if (action === 'select') {
      if (!variantUrl) {
        return NextResponse.json({ error: 'Missing variantUrl' }, { status: 400 });
      }

      try {
        await db
          .updateTable('scenes')
          .set({ image_url: variantUrl })
          .where('id', '=', sceneId)
          .execute();
      } catch (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
      }

      if (scene.paired_scene) {
        console.log('[SaveVariant] Syncing selected image_url to paired scene:', scene.paired_scene);
        await db
          .updateTable('scenes')
          .set({ image_url: variantUrl })
          .where('slug', '=', scene.paired_scene)
          .execute();
      }

      return NextResponse.json({
        success: true,
        message: 'Variant selected as main image',
        selectedUrl: variantUrl,
      });
    }

    // Action: delete - Remove a variant
    if (action === 'delete') {
      if (!variantUrl) {
        return NextResponse.json({ error: 'Missing variantUrl' }, { status: 400 });
      }

      const getBaseUrl = (url: string) => url?.split('?')[0] || '';
      const deletedBaseUrl = getBaseUrl(variantUrl);

      let currentVariants: ImageVariant[] = (scene.image_variants as unknown as ImageVariant[]) || [];
      let targetSceneId = sceneId;

      const variantInCurrent = currentVariants.some(v => getBaseUrl(v.url) === deletedBaseUrl);

      if (!variantInCurrent && scene.shared_images_with) {
        const sourceScene = await db
          .selectFrom('scenes')
          .select('image_variants')
          .where('id', '=', scene.shared_images_with)
          .executeTakeFirst();

        if (sourceScene?.image_variants) {
          currentVariants = sourceScene.image_variants as unknown as ImageVariant[];
          targetSceneId = scene.shared_images_with;
          console.log('[SaveVariant] Deleting from shared source scene:', targetSceneId);
        }
      }

      const updatedVariants = currentVariants.filter(v => getBaseUrl(v.url) !== deletedBaseUrl);

      try {
        await db
          .updateTable('scenes')
          .set({ image_variants: updatedVariants as unknown as Json })
          .where('id', '=', targetSceneId)
          .execute();
      } catch (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
      }

      if (targetSceneId !== sceneId) {
        const sourceScene = await db
          .selectFrom('scenes')
          .select('paired_scene')
          .where('id', '=', targetSceneId)
          .executeTakeFirst();

        if (sourceScene?.paired_scene) {
          const pairedScene = await db
            .selectFrom('scenes')
            .select('image_variants')
            .where('slug', '=', sourceScene.paired_scene)
            .executeTakeFirst();

          if (pairedScene?.image_variants) {
            const pairedVariants = (pairedScene.image_variants as unknown as ImageVariant[]).filter(
              v => getBaseUrl(v.url) !== deletedBaseUrl
            );
            await db
              .updateTable('scenes')
              .set({ image_variants: pairedVariants as unknown as Json })
              .where('slug', '=', sourceScene.paired_scene)
              .execute();
            console.log(`[SaveVariant] Synced deletion to paired scene of source`);
          }
        }
      } else {
        const pairedId = await resolvePairedSceneId(scene.paired_scene);
        const linkedIds = [pairedId, scene.shared_images_with].filter(Boolean) as string[];

        const reverseLinked = await db
          .selectFrom('scenes')
          .select('id')
          .where('shared_images_with', '=', sceneId)
          .execute();

        for (const r of reverseLinked) {
          if (r.id) linkedIds.push(r.id);
        }

        const uniqueLinkedIds = [...new Set(linkedIds)];

        for (const linkedId of uniqueLinkedIds) {
          const linked = await db
            .selectFrom('scenes')
            .select('image_variants')
            .where('id', '=', linkedId)
            .executeTakeFirst();

          if (linked?.image_variants) {
            const linkedVariants = (linked.image_variants as unknown as ImageVariant[]).filter(
              v => getBaseUrl(v.url) !== deletedBaseUrl
            );
            await db
              .updateTable('scenes')
              .set({ image_variants: linkedVariants as unknown as Json })
              .where('id', '=', linkedId)
              .execute();
            console.log(`[SaveVariant] Synced deletion to linked scene ${linkedId}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Variant deleted',
        variants: updatedVariants,
        modifiedSceneId: targetSceneId,
      });
    }

    // Action: delete_placeholder - Remove a placeholder slot by index
    if (action === 'delete_placeholder') {
      const { placeholderIndex } = body;
      if (typeof placeholderIndex !== 'number') {
        return NextResponse.json({ error: 'Missing placeholderIndex' }, { status: 400 });
      }

      const currentVariants: ImageVariant[] = (scene.image_variants as unknown as ImageVariant[]) || [];
      const updatedVariants = currentVariants.filter((_, idx) => idx !== placeholderIndex);

      try {
        await db
          .updateTable('scenes')
          .set({ image_variants: updatedVariants as unknown as Json })
          .where('id', '=', sceneId)
          .execute();
      } catch (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Placeholder deleted',
        variants: updatedVariants,
      });
    }

    // Action: add_placeholder - Add an empty slot for future generation
    if (action === 'add_placeholder') {
      const currentVariants: ImageVariant[] = (scene.image_variants as unknown as ImageVariant[]) || [];

      const placeholder: ImageVariant = {
        url: `placeholder_${Date.now()}`,
        prompt: '',
        created_at: new Date().toISOString(),
        is_placeholder: true,
      };

      const updatedVariants = [...currentVariants, placeholder];

      try {
        await db
          .updateTable('scenes')
          .set({ image_variants: updatedVariants as unknown as Json })
          .where('id', '=', sceneId)
          .execute();
      } catch (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Placeholder slot added',
        variants: updatedVariants,
        placeholderIndex: updatedVariants.length - 1,
      });
    }

    // Action: fill_placeholder - Replace placeholder with generated image
    if (action === 'fill_placeholder') {
      const { index } = body;
      if (typeof index !== 'number' || !imageUrl) {
        return NextResponse.json({ error: 'Missing index or imageUrl' }, { status: 400 });
      }

      const currentVariants: ImageVariant[] = (scene.image_variants as unknown as ImageVariant[]) || [];

      if (index < 0 || index >= currentVariants.length) {
        return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
      }

      currentVariants[index] = {
        url: imageUrl,
        prompt: prompt || scene.generation_prompt || '',
        created_at: new Date().toISOString(),
        is_placeholder: false,
      };

      try {
        await db
          .updateTable('scenes')
          .set({ image_variants: currentVariants as unknown as Json })
          .where('id', '=', sceneId)
          .execute();
      } catch (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: (updateError as Error).message }, { status: 500 });
      }

      await syncVariantsToLinkedScenes(
        sceneId,
        currentVariants,
        scene.paired_scene,
        scene.shared_images_with
      );

      return NextResponse.json({
        success: true,
        message: 'Placeholder filled with image',
        variants: currentVariants,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[SaveVariant] Exception:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

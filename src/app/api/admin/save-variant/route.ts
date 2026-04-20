import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/compat-types';
import { requireAdmin } from '@/lib/admin-auth';

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  const { data } = await supabase
    .from('scenes')
    .select('id')
    .eq('slug', pairedSlug)
    .single();
  return data?.id || null;
}

// Sync image_variants to linked scenes (paired_scene and shared_images_with)
// Also syncs to scenes that reference this scene via shared_images_with (reverse sync)
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
  const { data: reverseLinked } = await supabase
    .from('scenes')
    .select('id')
    .eq('shared_images_with', sceneId);

  if (reverseLinked) {
    linkedIds.push(...reverseLinked.map(s => s.id));
  }

  // Deduplicate
  const uniqueLinkedIds = [...new Set(linkedIds)];

  for (const linkedId of uniqueLinkedIds) {
    // Get current variants of linked scene
    const { data: linked } = await supabase
      .from('scenes')
      .select('image_variants')
      .eq('id', linkedId)
      .single();

    if (!linked) continue;

    // Merge variants (add new ones that don't exist)
    const linkedVariants: ImageVariant[] = linked.image_variants || [];
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
      await supabase
        .from('scenes')
        .update({ image_variants: linkedVariants })
        .eq('id', linkedId);
      console.log(`[SaveVariant] Synced variants to linked scene ${linkedId}`);
    }
  }
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    // Read body once at the beginning
    const body = await req.json();
    const { sceneId, action, variantUrl, imageUrl, prompt } = body;

    if (!sceneId) {
      return NextResponse.json({ error: 'Missing sceneId' }, { status: 400 });
    }

    // Get current scene with linked scenes
    const { data: scene, error: selectError } = await supabase
      .from('scenes')
      .select('image_url, generation_prompt, image_variants, qa_status, qa_last_assessment, paired_scene, shared_images_with')
      .eq('id', sceneId)
      .single();

    if (selectError || !scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    // Action: save - Save specified image to variants
    if (action === 'save') {
      // Use imageUrl from request if provided, otherwise fall back to DB
      const urlToSave = imageUrl || scene.image_url;
      const promptToSave = prompt || scene.generation_prompt || '';

      if (!urlToSave) {
        return NextResponse.json({ error: 'No image to save' }, { status: 400 });
      }

      const currentVariants: ImageVariant[] = scene.image_variants || [];

      console.log('[SaveVariant] Scene:', sceneId);
      console.log('[SaveVariant] Current variants in DB:', currentVariants.length);
      currentVariants.forEach((v, i) => console.log(`  [${i}] ${v.url?.substring(0, 60)}...`));
      console.log('[SaveVariant] URL to save:', urlToSave?.substring(0, 60) + '...');

      // Helper to compare URLs without query params (like ?t=timestamp)
      const getBaseUrl = (url: string) => url.split('?')[0];
      const baseUrlToSave = getBaseUrl(urlToSave);

      // Check if this URL is already saved (ignore query params)
      if (currentVariants.some(v => getBaseUrl(v.url) === baseUrlToSave)) {
        return NextResponse.json({
          success: true,
          message: 'Image already saved as variant',
          variants: currentVariants
        });
      }

      // Create new variant from specified image
      const newVariant: ImageVariant = {
        url: urlToSave,
        prompt: promptToSave,
        created_at: new Date().toISOString(),
        qa_status: scene.qa_status || null,
        qa_score: (scene.qa_last_assessment as { essenceScore?: number })?.essenceScore,
      };

      const updatedVariants = [...currentVariants, newVariant];

      // If scene has no image_url, set it from the first variant
      const updateData: { image_variants: ImageVariant[]; image_url?: string } = {
        image_variants: updatedVariants,
      };
      if (!scene.image_url) {
        updateData.image_url = urlToSave;
        console.log('[SaveVariant] Also setting image_url (was empty)');
      }

      // Update scene with new variants array (and possibly image_url)
      const { error: updateError } = await supabase
        .from('scenes')
        .update(updateData)
        .eq('id', sceneId);

      if (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log('[SaveVariant] Saved! New total:', updatedVariants.length);

      // Sync to linked scenes (paired_scene and shared_images_with)
      await syncVariantsToLinkedScenes(
        sceneId,
        updatedVariants,
        scene.paired_scene,
        scene.shared_images_with
      );

      // If we set image_url, also sync it to linked scenes that have no image_url
      if (updateData.image_url) {
        const pairedId = await resolvePairedSceneId(scene.paired_scene);
        const linkedIds = [pairedId, scene.shared_images_with].filter(Boolean) as string[];
        for (const linkedId of linkedIds) {
          const { data: linked } = await supabase
            .from('scenes')
            .select('image_url')
            .eq('id', linkedId)
            .single();

          if (linked && !linked.image_url) {
            await supabase
              .from('scenes')
              .update({ image_url: updateData.image_url })
              .eq('id', linkedId);
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

      // For shared images, the variant may be in the source scene
      // Just set the image_url directly - we trust the URL is valid
      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_url: variantUrl })
        .eq('id', sceneId);

      if (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Sync image_url to paired scene (but NOT to shared_images_with source)
      if (scene.paired_scene) {
        console.log('[SaveVariant] Syncing selected image_url to paired scene:', scene.paired_scene);
        await supabase
          .from('scenes')
          .update({ image_url: variantUrl })
          .eq('slug', scene.paired_scene);
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

      let currentVariants: ImageVariant[] = scene.image_variants || [];
      let targetSceneId = sceneId;

      // If variant not in current scene, check if it's from shared_images_with source
      const variantInCurrent = currentVariants.some(v => getBaseUrl(v.url) === deletedBaseUrl);

      if (!variantInCurrent && scene.shared_images_with) {
        // Get source scene's variants
        const { data: sourceScene } = await supabase
          .from('scenes')
          .select('image_variants')
          .eq('id', scene.shared_images_with)
          .single();

        if (sourceScene?.image_variants) {
          currentVariants = sourceScene.image_variants;
          targetSceneId = scene.shared_images_with;
          console.log('[SaveVariant] Deleting from shared source scene:', targetSceneId);
        }
      }

      const updatedVariants = currentVariants.filter(v => getBaseUrl(v.url) !== deletedBaseUrl);

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_variants: updatedVariants })
        .eq('id', targetSceneId);

      if (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // If deleted from source, also sync to paired scene of source
      if (targetSceneId !== sceneId) {
        const { data: sourceScene } = await supabase
          .from('scenes')
          .select('paired_scene')
          .eq('id', targetSceneId)
          .single();

        if (sourceScene?.paired_scene) {
          const { data: pairedScene } = await supabase
            .from('scenes')
            .select('image_variants')
            .eq('slug', sourceScene.paired_scene)
            .single();

          if (pairedScene?.image_variants) {
            const pairedVariants = (pairedScene.image_variants as ImageVariant[]).filter(
              v => getBaseUrl(v.url) !== deletedBaseUrl
            );
            await supabase
              .from('scenes')
              .update({ image_variants: pairedVariants })
              .eq('slug', sourceScene.paired_scene);
            console.log(`[SaveVariant] Synced deletion to paired scene of source`);
          }
        }
      } else {
        // Sync deletion to linked scenes (direct + reverse)
        const pairedId = await resolvePairedSceneId(scene.paired_scene);
        const linkedIds = [pairedId, scene.shared_images_with].filter(Boolean) as string[];

        // Also find scenes that reference this scene via shared_images_with (reverse links)
        const { data: reverseLinked } = await supabase
          .from('scenes')
          .select('id')
          .eq('shared_images_with', sceneId);

        if (reverseLinked) {
          linkedIds.push(...reverseLinked.map(s => s.id));
        }

        // Deduplicate
        const uniqueLinkedIds = [...new Set(linkedIds)];

        for (const linkedId of uniqueLinkedIds) {
          const { data: linked } = await supabase
            .from('scenes')
            .select('image_variants')
            .eq('id', linkedId)
            .single();

          if (linked?.image_variants) {
            const linkedVariants = (linked.image_variants as ImageVariant[]).filter(
              v => getBaseUrl(v.url) !== deletedBaseUrl
            );
            await supabase
              .from('scenes')
              .update({ image_variants: linkedVariants })
              .eq('id', linkedId);
            console.log(`[SaveVariant] Synced deletion to linked scene ${linkedId}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Variant deleted',
        variants: updatedVariants,
        modifiedSceneId: targetSceneId, // Return which scene was actually modified
      });
    }

    // Action: delete_placeholder - Remove a placeholder slot by index
    if (action === 'delete_placeholder') {
      const { placeholderIndex } = body;
      if (typeof placeholderIndex !== 'number') {
        return NextResponse.json({ error: 'Missing placeholderIndex' }, { status: 400 });
      }

      const currentVariants: ImageVariant[] = scene.image_variants || [];
      const updatedVariants = currentVariants.filter((_, idx) => idx !== placeholderIndex);

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_variants: updatedVariants })
        .eq('id', sceneId);

      if (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Placeholder deleted',
        variants: updatedVariants,
      });
    }

    // Action: add_placeholder - Add an empty slot for future generation
    if (action === 'add_placeholder') {
      const currentVariants: ImageVariant[] = scene.image_variants || [];

      const placeholder: ImageVariant = {
        url: `placeholder_${Date.now()}`,
        prompt: '',
        created_at: new Date().toISOString(),
        is_placeholder: true,
      };

      const updatedVariants = [...currentVariants, placeholder];

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_variants: updatedVariants })
        .eq('id', sceneId);

      if (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
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

      const currentVariants: ImageVariant[] = scene.image_variants || [];

      if (index < 0 || index >= currentVariants.length) {
        return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
      }

      // Replace placeholder with actual image
      currentVariants[index] = {
        url: imageUrl,
        prompt: prompt || scene.generation_prompt || '',
        created_at: new Date().toISOString(),
        is_placeholder: false,
      };

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_variants: currentVariants })
        .eq('id', sceneId);

      if (updateError) {
        console.error('[SaveVariant] Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Sync to linked scenes
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

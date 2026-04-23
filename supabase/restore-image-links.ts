// @ts-nocheck - Legacy one-off migration script; depends on removed @supabase/supabase-js.
/**
 * Restore Image Links - Re-link storage images to scenes by UUID
 *
 * Files in storage are named: ${sceneId}_${timestamp}.${extension}
 * This script extracts the UUID and links images back to their scenes.
 *
 * Run: npx tsx supabase/restore-image-links.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --force      Overwrite existing image_url even if set
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
}

interface StorageFile {
  name: string;
  created_at: string;
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

async function main() {
  console.log('='.repeat(50));
  console.log(' Restore Image Links from Storage');
  console.log('='.repeat(50));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Force overwrite: ${FORCE ? 'YES' : 'NO'}`);
  console.log('');

  // 1. Get all files from storage
  console.log('Loading storage files...');
  const { data: files, error: storageError } = await supabase.storage
    .from('scenes')
    .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

  if (storageError) {
    console.error('Storage error:', storageError);
    process.exit(1);
  }

  const imageFiles = (files || []).filter(f =>
    f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)
  );
  console.log(`Found ${imageFiles.length} image files in storage`);

  // 2. Extract UUIDs from filenames
  // Format: ${uuid}_${timestamp}.${ext} or ${uuid}.${ext}
  const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

  const filesBySceneId: Map<string, StorageFile[]> = new Map();
  let unmatchedFiles: string[] = [];

  for (const file of imageFiles) {
    const match = file.name.match(uuidPattern);
    if (match) {
      const sceneId = match[1].toLowerCase();
      if (!filesBySceneId.has(sceneId)) {
        filesBySceneId.set(sceneId, []);
      }
      filesBySceneId.get(sceneId)!.push(file);
    } else {
      unmatchedFiles.push(file.name);
    }
  }

  console.log(`Files matched by UUID: ${imageFiles.length - unmatchedFiles.length}`);
  console.log(`Unmatched files: ${unmatchedFiles.length}`);
  if (unmatchedFiles.length > 0 && unmatchedFiles.length <= 10) {
    console.log('  Unmatched:', unmatchedFiles.join(', '));
  }
  console.log('');

  // 3. Get all scenes that need images
  console.log('Loading scenes...');
  let query = supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, generation_prompt')
    .gte('version', 2);

  if (!FORCE) {
    query = query.or('image_url.is.null,image_url.eq.');
  }

  const { data: scenes, error: scenesError } = await query;

  if (scenesError) {
    console.error('Scenes error:', scenesError);
    process.exit(1);
  }

  console.log(`Found ${scenes?.length || 0} scenes ${FORCE ? '(all)' : '(without images)'}`);
  console.log('');

  // 4. Match and update
  let updated = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const scene of scenes || []) {
    const sceneFiles = filesBySceneId.get(scene.id.toLowerCase());

    if (!sceneFiles || sceneFiles.length === 0) {
      noMatch++;
      continue;
    }

    // Sort by created_at desc to get the latest
    sceneFiles.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Get public URLs for all files
    const fileUrls = sceneFiles.map(f => ({
      url: supabase.storage.from('scenes').getPublicUrl(f.name).data.publicUrl,
      created_at: f.created_at,
      name: f.name
    }));

    // Use the latest file as main image
    const mainImageUrl = fileUrls[0].url;

    // Build image_variants array (merge with existing)
    const existingVariants: ImageVariant[] = scene.image_variants || [];
    const existingUrls = new Set(existingVariants.map(v => v.url.split('?')[0]));

    const newVariants: ImageVariant[] = [...existingVariants];

    for (const file of fileUrls) {
      const baseUrl = file.url.split('?')[0];
      if (!existingUrls.has(baseUrl)) {
        newVariants.push({
          url: file.url,
          prompt: scene.generation_prompt || 'Restored from storage',
          created_at: file.created_at || new Date().toISOString(),
          qa_status: null,
        });
        existingUrls.add(baseUrl);
      }
    }

    // Check if anything changed
    const hasNewMain = scene.image_url !== mainImageUrl;
    const hasNewVariants = newVariants.length > existingVariants.length;

    if (!hasNewMain && !hasNewVariants) {
      skipped++;
      continue;
    }

    console.log(`${DRY_RUN ? '[DRY] ' : ''}${scene.slug}:`);
    console.log(`  Files found: ${sceneFiles.length}`);
    if (hasNewMain) {
      console.log(`  Main image: ${mainImageUrl.substring(0, 60)}...`);
    }
    if (hasNewVariants) {
      console.log(`  Variants: ${existingVariants.length} -> ${newVariants.length}`);
    }

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('scenes')
        .update({
          image_url: mainImageUrl,
          image_variants: newVariants,
        })
        .eq('id', scene.id);

      if (updateError) {
        console.error(`  ERROR: ${updateError.message}`);
      } else {
        updated++;
      }
    } else {
      updated++;
    }
  }

  // 5. Summary
  console.log('');
  console.log('='.repeat(50));
  console.log(' SUMMARY');
  console.log('='.repeat(50));
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already linked): ${skipped}`);
  console.log(`No matching files: ${noMatch}`);

  if (DRY_RUN && updated > 0) {
    console.log('');
    console.log('Run without --dry-run to apply changes');
  }
}

main().catch(console.error);

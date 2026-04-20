/**
 * Migration Script: Merge shared images between scenes
 *
 * This script finds scenes that share the same image_url and merges their
 * image_variants arrays so both scenes have access to all images.
 *
 * Run with: npx tsx scripts/migrate-shared-images.ts
 *
 * Options:
 *   --dry-run    Show what would be changed without making changes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
  qa_score?: number;
  is_placeholder?: boolean;
}

interface Scene {
  id: string;
  slug: string;
  image_url: string | null;
  image_variants: ImageVariant[] | null;
  generation_prompt: string | null;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('Fetching scenes with images...');

  // Get all scenes with image_url
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, generation_prompt')
    .not('image_url', 'is', null);

  if (error) {
    console.error('Error fetching scenes:', error);
    process.exit(1);
  }

  if (!scenes || scenes.length === 0) {
    console.log('No scenes with images found.');
    return;
  }

  console.log(`Found ${scenes.length} scenes with images.\n`);

  // Group scenes by image_url
  const imageGroups = new Map<string, Scene[]>();

  for (const scene of scenes) {
    if (!scene.image_url) continue;

    const existing = imageGroups.get(scene.image_url) || [];
    existing.push(scene as Scene);
    imageGroups.set(scene.image_url, existing);
  }

  // Find groups with multiple scenes (shared images)
  const sharedGroups = Array.from(imageGroups.entries()).filter(
    ([, group]) => group.length > 1
  );

  if (sharedGroups.length === 0) {
    console.log('No shared images found between scenes.');
    return;
  }

  console.log(`Found ${sharedGroups.length} shared image groups:\n`);

  let updatedCount = 0;

  for (const [imageUrl, groupScenes] of sharedGroups) {
    console.log(`\n📷 Shared image: ${imageUrl.slice(0, 60)}...`);
    console.log(`   Scenes: ${groupScenes.map((s) => s.slug).join(', ')}`);

    // Collect all unique variants from all scenes in the group
    const allVariants = new Map<string, ImageVariant>();

    // First, add the main image_url as a variant if not already present
    const mainVariant: ImageVariant = {
      url: imageUrl,
      prompt: groupScenes[0].generation_prompt || '',
      created_at: new Date().toISOString(),
      is_placeholder: false,
    };
    allVariants.set(imageUrl, mainVariant);

    // Then collect all existing variants from all scenes
    for (const scene of groupScenes) {
      if (scene.image_variants && Array.isArray(scene.image_variants)) {
        for (const variant of scene.image_variants) {
          if (!variant.is_placeholder && variant.url) {
            allVariants.set(variant.url, variant);
          }
        }
      }
    }

    const mergedVariants = Array.from(allVariants.values());
    console.log(`   Total unique images after merge: ${mergedVariants.length}`);

    // Update each scene in the group with the merged variants
    for (const scene of groupScenes) {
      const currentCount = scene.image_variants?.filter((v) => !v.is_placeholder).length || 0;

      if (currentCount === mergedVariants.length) {
        console.log(`   ✓ ${scene.slug}: Already has all ${mergedVariants.length} images`);
        continue;
      }

      console.log(
        `   → ${scene.slug}: Updating from ${currentCount} to ${mergedVariants.length} images`
      );

      if (!isDryRun) {
        const { error: updateError } = await supabase
          .from('scenes')
          .update({ image_variants: mergedVariants })
          .eq('id', scene.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${scene.slug}:`, updateError);
        } else {
          console.log(`   ✓ ${scene.slug}: Updated successfully`);
          updatedCount++;
        }
      } else {
        console.log(`   (would update ${scene.slug})`);
        updatedCount++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  if (isDryRun) {
    console.log(`DRY RUN: Would update ${updatedCount} scenes.`);
    console.log('Run without --dry-run to apply changes.');
  } else {
    console.log(`Updated ${updatedCount} scenes.`);
  }
}

main().catch(console.error);

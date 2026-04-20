/**
 * Merge image galleries for onboarding give/receive pairs
 *
 * These pairs show the same action from different perspectives
 * and should share the same image gallery.
 *
 * Run with: npx tsx scripts/merge-onboarding-galleries.ts
 * Options:
 *   --dry-run    Show what would be changed without making changes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

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

// Pairs of scenes that should share galleries
// Format: [give_slug, receive_slug]
const ONBOARDING_PAIRS: [string, string][] = [
  // Oral
  ['onboarding-oral-give-hetero-f', 'onboarding-oral-receive-hetero-m'], // BJ
  ['onboarding-oral-give-hetero-m', 'onboarding-oral-receive-hetero-f'], // Cunni
  // Anal
  ['onboarding-anal-give-hetero-f', 'onboarding-anal-receive-hetero-m'], // Pegging
  ['onboarding-anal-give-hetero-m', 'onboarding-anal-receive-hetero-f'], // Anal on her
  // Bondage
  ['onboarding-bondage-give-hetero-m', 'onboarding-bondage-receive-hetero-f'],
  ['onboarding-bondage-give-hetero-f', 'onboarding-bondage-receive-hetero-m'],
  // Foot
  ['onboarding-foot-give-hetero-m', 'onboarding-foot-receive-hetero-f'],
  ['onboarding-foot-give-hetero-f', 'onboarding-foot-receive-hetero-m'],
  // Power
  ['onboarding-power-dom-hetero-m', 'onboarding-power-sub-hetero-f'],
  ['onboarding-power-dom-hetero-f', 'onboarding-power-sub-hetero-m'],
  // Rough
  ['onboarding-rough-give-hetero-m', 'onboarding-rough-receive-hetero-f'],
  ['onboarding-rough-give-hetero-f', 'onboarding-rough-receive-hetero-m'],
  // Body fluids
  ['onboarding-body-fluids-give-hetero-m', 'onboarding-body-fluids-receive-hetero-f'],
  ['onboarding-body-fluids-give-hetero-f', 'onboarding-body-fluids-receive-hetero-m'],
  // Dirty talk
  ['onboarding-dirty-talk-give-hetero-m', 'onboarding-dirty-talk-receive-hetero-f'],
  ['onboarding-dirty-talk-give-hetero-f', 'onboarding-dirty-talk-receive-hetero-m'],
  // Praise
  ['onboarding-praise-give-hetero-m', 'onboarding-praise-receive-hetero-f'],
  ['onboarding-praise-give-hetero-f', 'onboarding-praise-receive-hetero-m'],
];

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  console.log(`Processing ${ONBOARDING_PAIRS.length} pairs...\n`);

  let mergedCount = 0;
  let skippedCount = 0;

  for (const [slug1, slug2] of ONBOARDING_PAIRS) {
    // Fetch both scenes
    const { data: scenes, error } = await supabase
      .from('scenes')
      .select('id, slug, image_url, image_variants')
      .in('slug', [slug1, slug2]);

    if (error) {
      console.error(`Error fetching ${slug1}/${slug2}:`, error.message);
      continue;
    }

    if (!scenes || scenes.length !== 2) {
      console.log(`SKIP: ${slug1} / ${slug2} - not found (got ${scenes?.length || 0})`);
      skippedCount++;
      continue;
    }

    const scene1 = scenes.find((s) => s.slug === slug1)!;
    const scene2 = scenes.find((s) => s.slug === slug2)!;

    // Collect all unique images from both scenes
    const allImages = new Map<string, ImageVariant>();

    // Add image_url as variant if not in variants
    for (const scene of [scene1, scene2]) {
      if (scene.image_url && !scene.image_url.startsWith('placeholder')) {
        allImages.set(scene.image_url, {
          url: scene.image_url,
          prompt: '',
          created_at: new Date().toISOString(),
        });
      }

      const variants: ImageVariant[] = scene.image_variants || [];
      for (const v of variants) {
        if (v.url && !v.url.startsWith('placeholder') && !v.is_placeholder) {
          allImages.set(v.url, v);
        }
      }
    }

    const mergedVariants = Array.from(allImages.values());

    // Check if merge is needed
    const scene1Count = (scene1.image_variants || []).filter(
      (v: ImageVariant) => !v.is_placeholder
    ).length;
    const scene2Count = (scene2.image_variants || []).filter(
      (v: ImageVariant) => !v.is_placeholder
    ).length;

    if (scene1Count === mergedVariants.length && scene2Count === mergedVariants.length) {
      console.log(`OK: ${slug1} / ${slug2} - already synced (${mergedVariants.length} images)`);
      continue;
    }

    console.log(`\nMERGE: ${slug1} / ${slug2}`);
    console.log(`  ${slug1}: ${scene1Count} images`);
    console.log(`  ${slug2}: ${scene2Count} images`);
    console.log(`  Merged: ${mergedVariants.length} unique images`);

    if (!isDryRun) {
      // Update both scenes with merged gallery
      for (const scene of [scene1, scene2]) {
        const { error: updateError } = await supabase
          .from('scenes')
          .update({ image_variants: mergedVariants })
          .eq('id', scene.id);

        if (updateError) {
          console.error(`  Error updating ${scene.slug}:`, updateError.message);
        } else {
          console.log(`  Updated ${scene.slug}`);
        }
      }
      mergedCount++;
    } else {
      console.log(`  (would update both scenes)`);
      mergedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Merged: ${mergedCount} pairs`);
  console.log(`Skipped: ${skippedCount} pairs`);

  if (isDryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch(console.error);

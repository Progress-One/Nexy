/**
 * Analysis Script: Find scenes that could share the same image
 *
 * This script analyzes scenes to find pairs where one image could work for both:
 * - Example: "F giving oral to M" image works for:
 *   - M's question: "Do you like receiving oral?"
 *   - F's question: "Do you like giving oral?"
 *
 * Run with: npx tsx scripts/analyze-shareable-scenes.ts
 *
 * Output: Report of scene pairs that could share images
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

interface Scene {
  id: string;
  slug: string;
  category: string;
  role_direction: string | null;
  title: { ru: string; en: string } | null;
  user_description: { ru: string; en: string } | null;
  image_url: string | null;
  image_variants: any[] | null;
}

// Complementary role directions - pairs that show the same action from different perspectives
const COMPLEMENTARY_DIRECTIONS: Record<string, string[]> = {
  'm_to_f': ['f_to_m'],      // M does to F <-> F receives from M
  'f_to_m': ['m_to_f'],      // F does to M <-> M receives from F
  'mutual': [],              // Both participate equally
  'solo': [],                // Solo scenes
  'm_dom_f_pet': ['f_dom_m_pet', 'f_dom_m_sub'],
  'f_dom_m_pet': ['m_dom_f_pet'],
  'f_dom_m_sub': ['m_dom_f_pet'],
  'm_daddy_f_little': ['f_mommy_m_little'],
  'f_mommy_m_little': ['m_daddy_f_little'],
  'm_keyholder_f_locked': ['f_keyholder_m_locked'],
  'f_keyholder_m_locked': ['m_keyholder_f_locked'],
};

// Categories where role direction matters for image sharing
const DIRECTIONAL_CATEGORIES = [
  'oral',
  'foreplay',
  'penetration',
  'anal',
  'rough',
  'power_dynamic',
  'body_worship',
];

interface ScenePair {
  scene1: Scene;
  scene2: Scene;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

function findComplementaryPairs(scenes: Scene[]): ScenePair[] {
  const pairs: ScenePair[] = [];
  const processed = new Set<string>();

  // Group scenes by category
  const byCategory = new Map<string, Scene[]>();
  for (const scene of scenes) {
    const cat = scene.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(scene);
  }

  console.log('\n📊 Scenes by category:');
  for (const [cat, catScenes] of byCategory) {
    console.log(`   ${cat}: ${catScenes.length} scenes`);
  }

  // For each directional category, find complementary pairs
  for (const category of DIRECTIONAL_CATEGORIES) {
    const catScenes = byCategory.get(category) || [];

    for (const scene1 of catScenes) {
      if (!scene1.role_direction) continue;

      const complementaryDirs = COMPLEMENTARY_DIRECTIONS[scene1.role_direction] || [];
      if (complementaryDirs.length === 0) continue;

      for (const scene2 of catScenes) {
        if (scene1.id === scene2.id) continue;
        if (!scene2.role_direction) continue;

        // Skip if already processed this pair
        const pairKey = [scene1.id, scene2.id].sort().join('-');
        if (processed.has(pairKey)) continue;

        // Check if directions are complementary
        if (complementaryDirs.includes(scene2.role_direction)) {
          processed.add(pairKey);

          // Determine confidence based on how similar the scenes are
          let confidence: 'high' | 'medium' | 'low' = 'medium';

          // High confidence if slugs suggest same action
          const slug1Base = scene1.slug.replace(/_[mf]_to_[mf]|_give|_receive/g, '');
          const slug2Base = scene2.slug.replace(/_[mf]_to_[mf]|_give|_receive/g, '');
          if (slug1Base === slug2Base) {
            confidence = 'high';
          }

          pairs.push({
            scene1,
            scene2,
            reason: `${scene1.role_direction} ↔ ${scene2.role_direction}`,
            confidence,
          });
        }
      }
    }
  }

  return pairs;
}

function analyzeImageSharing(pairs: ScenePair[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('SCENE PAIRS THAT COULD SHARE IMAGES');
  console.log('='.repeat(70));

  // Group by confidence
  const highConf = pairs.filter(p => p.confidence === 'high');
  const medConf = pairs.filter(p => p.confidence === 'medium');
  const lowConf = pairs.filter(p => p.confidence === 'low');

  if (highConf.length > 0) {
    console.log(`\n🟢 HIGH CONFIDENCE (${highConf.length} pairs):`);
    console.log('   These scenes are very likely to share the same image\n');

    for (const pair of highConf) {
      printPair(pair);
    }
  }

  if (medConf.length > 0) {
    console.log(`\n🟡 MEDIUM CONFIDENCE (${medConf.length} pairs):`);
    console.log('   These scenes might share an image - manual review needed\n');

    for (const pair of medConf) {
      printPair(pair);
    }
  }

  if (lowConf.length > 0) {
    console.log(`\n🔴 LOW CONFIDENCE (${lowConf.length} pairs):`);
    for (const pair of lowConf) {
      printPair(pair);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total potential pairs: ${pairs.length}`);
  console.log(`  High confidence: ${highConf.length}`);
  console.log(`  Medium confidence: ${medConf.length}`);
  console.log(`  Low confidence: ${lowConf.length}`);

  // Count how many already share images
  const alreadySharing = pairs.filter(p =>
    p.scene1.image_url && p.scene2.image_url && p.scene1.image_url === p.scene2.image_url
  );
  console.log(`\nAlready sharing same image: ${alreadySharing.length} pairs`);

  // Count where one has image and other doesn't
  const oneHasImage = pairs.filter(p =>
    (p.scene1.image_url && !p.scene2.image_url) || (!p.scene1.image_url && p.scene2.image_url)
  );
  console.log(`One has image, other doesn't: ${oneHasImage.length} pairs`);

  // Both have different images
  const bothDifferent = pairs.filter(p =>
    p.scene1.image_url && p.scene2.image_url && p.scene1.image_url !== p.scene2.image_url
  );
  console.log(`Both have different images: ${bothDifferent.length} pairs`);
}

function printPair(pair: ScenePair): void {
  const s1 = pair.scene1;
  const s2 = pair.scene2;

  console.log(`   ┌─ ${s1.slug}`);
  console.log(`   │  ${s1.role_direction} | ${s1.title?.ru || s1.title?.en || 'no title'}`);
  console.log(`   │  ${s1.image_url ? '🖼️  Has image' : '❌ No image'}`);
  console.log(`   │`);
  console.log(`   │  ${pair.reason}`);
  console.log(`   │`);
  console.log(`   └─ ${s2.slug}`);
  console.log(`      ${s2.role_direction} | ${s2.title?.ru || s2.title?.en || 'no title'}`);
  console.log(`      ${s2.image_url ? '🖼️  Has image' : '❌ No image'}`);

  // Show if they already share
  if (s1.image_url && s2.image_url) {
    if (s1.image_url === s2.image_url) {
      console.log(`      ✅ Already sharing same image!`);
    } else {
      console.log(`      ⚠️  Have different images`);
    }
  }
  console.log('');
}

async function main() {
  console.log('Fetching scenes...');

  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, category, role_direction, title, user_description, image_url, image_variants')
    .eq('version', 2)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching scenes:', error);
    process.exit(1);
  }

  if (!scenes || scenes.length === 0) {
    console.log('No scenes found.');
    return;
  }

  console.log(`Found ${scenes.length} active V2 scenes.`);

  const pairs = findComplementaryPairs(scenes as Scene[]);
  analyzeImageSharing(pairs);
}

main().catch(console.error);

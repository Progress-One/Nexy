/**
 * Analyze scenes that need give/receive perspectives
 *
 * For scenes with directional actions (m_to_f, f_to_m), we need:
 * - One scene for the "giver" perspective (person doing the action)
 * - One scene for the "receiver" perspective (person receiving)
 *
 * Same image, different user_description.
 *
 * Run: npx tsx scripts/analyze-perspectives.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Scene {
  id: string;
  slug: string;
  category: string;
  role_direction: string | null;
  title: { ru: string; en: string };
  user_description: { ru: string; en: string } | null;
}

// Scenes that naturally have give/receive perspectives
// These are directional actions where one person does something TO another
const DIRECTIONAL_CATEGORIES = [
  'oral',
  'manual',
  'anal',
  'massage',
  'worship',
  'worship_service',
  'worship-service',
  'impact_pain',
  'impact-pain',
  'control',
  'control_power',
  'control-power',
  'verbal',
  'body_fluids',
  'cnc_rough',
  'cnc-rough',
  'extreme',
  'sensory',
  'exhibitionism',
];

async function main() {
  console.log('Analyzing scenes that need give/receive perspectives...\n');

  // Get all V2 scenes (excluding onboarding - they already have perspectives)
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, category, role_direction, title, user_description')
    .eq('version', 2)
    .neq('category', 'onboarding')
    .in('role_direction', ['m_to_f', 'f_to_m'])
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!scenes || scenes.length === 0) {
    console.log('No directional scenes found.');
    return;
  }

  console.log(`Found ${scenes.length} directional scenes (m_to_f or f_to_m)\n`);

  // Group by category
  const byCategory = new Map<string, Scene[]>();
  for (const scene of scenes as Scene[]) {
    const cat = scene.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(scene);
  }

  // Analyze each category
  let totalNeedPerspectives = 0;

  for (const [category, catScenes] of byCategory) {
    console.log('='.repeat(60));
    console.log(`CATEGORY: ${category.toUpperCase()} (${catScenes.length} scenes)`);
    console.log('='.repeat(60));

    for (const scene of catScenes) {
      const dir = scene.role_direction;
      const giver = dir === 'm_to_f' ? 'M' : 'F';
      const receiver = dir === 'm_to_f' ? 'F' : 'M';

      // Check if this scene already has a pair
      const baseName = scene.slug.replace(/-give$|-receive$/, '');
      const hasGive = catScenes.some(s => s.slug === `${baseName}-give`);
      const hasReceive = catScenes.some(s => s.slug === `${baseName}-receive`);

      const needsPerspectives = !hasGive || !hasReceive;
      if (needsPerspectives) totalNeedPerspectives++;

      console.log(`\n${scene.slug} (${dir})`);
      console.log(`  Title: ${scene.title?.ru || scene.title?.en}`);
      console.log(`  Giver: ${giver} | Receiver: ${receiver}`);
      console.log(`  Current desc: ${(scene.user_description?.ru || '').slice(0, 60)}...`);

      if (needsPerspectives) {
        console.log(`  STATUS: Needs give/receive split`);
        console.log(`    → ${scene.slug}-give (for ${giver}): "Ты делаешь..."`);
        console.log(`    → ${scene.slug}-receive (for ${receiver}): "Тебе делают..."`);
      } else {
        console.log(`  STATUS: Already has perspectives`);
      }
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total directional scenes: ${scenes.length}`);
  console.log(`Need give/receive split: ${totalNeedPerspectives}`);
  console.log(`\nNew scenes to create: ${totalNeedPerspectives * 2}`);
  console.log(`(Each scene becomes 2: one give, one receive)`);
}

main().catch(console.error);

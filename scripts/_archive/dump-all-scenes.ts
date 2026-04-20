/**
 * Dump all scenes for manual analysis
 *
 * Run with: npx tsx scripts/dump-all-scenes.ts
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

async function main() {
  console.log('Fetching all V2 scenes...\n');

  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, category, role_direction, title, user_description, image_url, is_active, version')
    .eq('version', 2)
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error fetching scenes:', error);
    process.exit(1);
  }

  if (!scenes || scenes.length === 0) {
    console.log('No scenes found.');
    return;
  }

  console.log(`Total V2 scenes: ${scenes.length}\n`);

  // Group by category
  const byCategory = new Map<string, typeof scenes>();
  for (const scene of scenes) {
    const cat = scene.category || 'uncategorized';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(scene);
  }

  // Print each category
  for (const [category, catScenes] of byCategory) {
    console.log('='.repeat(70));
    console.log(`CATEGORY: ${category.toUpperCase()} (${catScenes.length} scenes)`);
    console.log('='.repeat(70));

    for (const scene of catScenes) {
      const active = scene.is_active ? '✓' : '✗';
      const hasImage = scene.image_url ? '🖼️' : '❌';
      const title = scene.title?.ru || scene.title?.en || 'no title';
      const desc = scene.user_description?.ru || scene.user_description?.en || 'no desc';

      console.log(`\n[${active}] ${scene.slug}`);
      console.log(`    Direction: ${scene.role_direction || 'none'}`);
      console.log(`    Title: ${title}`);
      console.log(`    Desc: ${desc.slice(0, 100)}${desc.length > 100 ? '...' : ''}`);
      console.log(`    Image: ${hasImage}`);
    }
    console.log('\n');
  }

  // Summary by role_direction
  console.log('='.repeat(70));
  console.log('SUMMARY BY ROLE DIRECTION');
  console.log('='.repeat(70));

  const byDirection = new Map<string, number>();
  for (const scene of scenes) {
    const dir = scene.role_direction || 'none';
    byDirection.set(dir, (byDirection.get(dir) || 0) + 1);
  }

  for (const [dir, count] of [...byDirection.entries()].sort()) {
    console.log(`  ${dir}: ${count} scenes`);
  }
}

main().catch(console.error);

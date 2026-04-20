import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, category, user_description')
    .neq('category', 'onboarding')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const slugs = new Set(data?.map(s => s.slug) || []);

  // Find base scenes that have -give and -receive variants
  const baseScenes: typeof data = [];

  for (const scene of data || []) {
    // Skip if this is a -give or -receive variant
    if (scene.slug.endsWith('-give') || scene.slug.endsWith('-receive')) {
      continue;
    }

    // Check if -give and -receive exist
    const hasGive = slugs.has(scene.slug + '-give');
    const hasReceive = slugs.has(scene.slug + '-receive');

    if (hasGive || hasReceive) {
      baseScenes.push(scene);
    }
  }

  console.log('Base scenes with give/receive variants:\n');

  let currentCategory = '';
  for (const scene of baseScenes) {
    if (scene.category !== currentCategory) {
      currentCategory = scene.category;
      console.log('\n=== ' + currentCategory.toUpperCase() + ' ===\n');
    }

    const ruDesc = scene.user_description?.ru || '-';
    console.log(`${scene.slug}`);
    console.log(`  RU: ${ruDesc}`);
    console.log('');
  }

  console.log('\nTotal:', baseScenes.length);
}

run();

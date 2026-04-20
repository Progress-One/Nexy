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

  const duplicates: string[] = [];

  for (const scene of data || []) {
    if (scene.slug.endsWith('-give') || scene.slug.endsWith('-receive')) continue;
    const hasGive = slugs.has(scene.slug + '-give');
    const hasReceive = slugs.has(scene.slug + '-receive');
    if (hasGive || hasReceive) {
      duplicates.push(scene.slug);
    }
  }

  console.log(duplicates.join('\n'));
  console.log('\nTotal:', duplicates.length);
}

run();

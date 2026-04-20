import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug')
    .neq('category', 'onboarding')
    .eq('is_active', true)
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

  console.log(`Деактивация ${duplicates.length} базовых сцен...\n`);

  const { data: updated, error: updateError } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', duplicates)
    .select('slug');

  if (updateError) {
    console.error('Error:', updateError);
    return;
  }

  console.log('Деактивировано:');
  for (const s of updated || []) {
    console.log('  ✗', s.slug);
  }

  console.log(`\nВсего: ${updated?.length}`);
}

run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .neq('category', 'onboarding')
    .eq('is_active', true)
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const sceneMap = new Map(data?.map(s => [s.slug, s.user_description?.ru || '-']) || []);
  const slugs = new Set(data?.map(s => s.slug) || []);

  let num = 1;

  for (const scene of data || []) {
    if (scene.slug.endsWith('-give') || scene.slug.endsWith('-receive')) continue;

    const hasGive = slugs.has(scene.slug + '-give');
    const hasReceive = slugs.has(scene.slug + '-receive');

    if (hasGive || hasReceive) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`#${num++}`);
      console.log(`${'='.repeat(80)}`);

      console.log(`\n📌 БАЗА: ${scene.slug}`);
      console.log(`   "${scene.user_description?.ru || '-'}"`);

      if (hasGive) {
        console.log(`\n   ➡️  GIVE: ${scene.slug}-give`);
        console.log(`      "${sceneMap.get(scene.slug + '-give')}"`);
      }

      if (hasReceive) {
        console.log(`\n   ⬅️  RECEIVE: ${scene.slug}-receive`);
        console.log(`      "${sceneMap.get(scene.slug + '-receive')}"`);
      }
    }
  }

  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`Всего: ${num - 1} базовых сцен с give/receive вариантами`);
}

run();

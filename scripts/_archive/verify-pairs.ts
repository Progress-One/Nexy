import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, role_direction')
    .or('slug.ilike.%-give,slug.ilike.%-receive')
    .eq('is_active', true)
    .order('slug');

  // Group by base slug
  const groups: Map<string, Array<{slug: string, role_direction: string, suffix: string}>> = new Map();

  for (const s of scenes || []) {
    let baseName = s.slug;
    let suffix = '';

    if (s.slug.endsWith('-give')) {
      baseName = s.slug.replace(/-give$/, '');
      suffix = 'give';
    } else if (s.slug.endsWith('-receive')) {
      baseName = s.slug.replace(/-receive$/, '');
      suffix = 'receive';
    }

    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }
    groups.get(baseName)!.push({ slug: s.slug, role_direction: s.role_direction, suffix });
  }

  console.log('Проверка: все give/receive пары должны иметь РАЗНЫЕ role_direction\n');

  let problemCount = 0;
  let okCount = 0;

  for (const [baseName, items] of groups) {
    const giveItems = items.filter(i => i.suffix === 'give');
    const receiveItems = items.filter(i => i.suffix === 'receive');

    for (const give of giveItems) {
      for (const receive of receiveItems) {
        if (give.role_direction === receive.role_direction) {
          problemCount++;
          console.log(`❌ ${baseName}`);
          console.log(`   GIVE: ${give.role_direction}`);
          console.log(`   RECEIVE: ${receive.role_direction}`);
        } else {
          okCount++;
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  if (problemCount === 0) {
    console.log(`\n✅ Все ${okCount} пар имеют РАЗНЫЕ role_direction!`);
  } else {
    console.log(`\n❌ Найдено ${problemCount} проблемных пар`);
    console.log(`✅ OK: ${okCount} пар`);
  }
}

run();

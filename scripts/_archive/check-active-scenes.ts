import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const scenesWithoutSpec = [
  'golden-shower-he-on-her-give', 'golden-shower-he-on-her-receive',
  'golden-shower-she-on-him-give', 'golden-shower-she-on-him-receive',
  'spitting-he-on-her-give', 'spitting-he-on-her-receive',
  'spitting-she-on-him-give', 'spitting-she-on-him-receive',
  'somnophilia-f-to-m-give', 'somnophilia-f-to-m-receive',
  'somnophilia-m-to-f-give', 'somnophilia-m-to-f-receive',
  'orgasm-control-f-to-m', 'orgasm-control-m-to-f',
  'ruined-orgasm-f-to-m-give', 'ruined-orgasm-f-to-m-receive',
  'ruined-orgasm-m-to-f-give', 'ruined-orgasm-m-to-f-receive',
  'glory-hole-blowjob-give', 'glory-hole-blowjob-receive',
  'breath-play-f-to-m-give', 'breath-play-f-to-m-receive',
  'breath-play-m-to-f-give', 'breath-play-m-to-f-receive',
  'fisting-f-to-m-give', 'fisting-f-to-m-receive',
  'fisting-m-to-f-give', 'fisting-m-to-f-receive',
  'knife-play-f-to-m-give', 'knife-play-f-to-m-receive',
  'knife-play-m-to-f-give', 'knife-play-m-to-f-receive',
  'nipple-play-he-on-her-give', 'nipple-play-he-on-her-receive',
  'nipple-play-she-on-him-give', 'nipple-play-she-on-him-receive',
  'wax-play-he-on-her-give', 'wax-play-he-on-her-receive',
  'wax-play-she-on-him-give', 'wax-play-she-on-him-receive',
  'facesitting-he-on-her-give', 'facesitting-he-on-her-receive'
];

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, category, is_active, tags')
    .in('slug', scenesWithoutSpec)
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Сцены без JSON-спецификации:\n');
  console.log('slug'.padEnd(40) + '| category'.padEnd(18) + '| active | tags[0]');
  console.log('-'.repeat(85));

  let activeCount = 0;
  let inactiveCount = 0;

  for (const s of data || []) {
    const status = s.is_active ? '✓' : '✗';
    if (s.is_active) activeCount++; else inactiveCount++;
    console.log(
      s.slug.padEnd(40) + '| ' +
      s.category.padEnd(16) + '| ' +
      status.padEnd(7) + '| ' +
      (s.tags?.[0] || 'none')
    );
  }

  console.log('\n' + '-'.repeat(85));
  console.log(`Активных: ${activeCount}, Неактивных: ${inactiveCount}`);

  // Проверяем, есть ли в системе gates для этих категорий
  console.log('\n\nКатегории этих сцен:');
  const categories = [...new Set((data || []).map(s => s.category))];
  for (const cat of categories.sort()) {
    const count = (data || []).filter(s => s.category === cat).length;
    console.log(`  - ${cat}: ${count} сцен`);
  }
}

run();

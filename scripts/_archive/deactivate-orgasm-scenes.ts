import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Deactivate only BASE discovery scenes (not -give/-receive onboarding variants)
  const baseSlugs = [
    'edging-he-controls-her',
    'edging-she-controls-him',
    'forced-orgasm-on-her',
    'forced-orgasm-on-him',
    'ruined-orgasm-m-to-f',
    'ruined-orgasm-f-to-m',
  ];

  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', baseSlugs)
    .select('slug');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(`Деактивировано ${data?.length || 0} сцен:`);
    for (const s of data || []) {
      console.log(`  ❌ ${s.slug}`);
    }
  }
}

run();

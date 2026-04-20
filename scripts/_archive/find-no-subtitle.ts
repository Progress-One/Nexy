import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, title')
    .eq('is_active', true)
    .is('subtitle', null);

  console.log('Сцены без subtitle:\n');
  for (const s of data || []) {
    console.log(`${s.slug} (${s.category})`);
  }
  console.log(`\nВсего: ${data?.length || 0}`);
}

run();

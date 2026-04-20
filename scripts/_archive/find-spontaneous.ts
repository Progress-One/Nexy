import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, is_active, user_description')
    .eq('category', 'spontaneous');

  console.log('Spontaneous category scenes:');
  for (const s of data || []) {
    const desc = s.user_description as any;
    console.log('\n' + s.slug, '| active:', s.is_active);
    console.log('  RU:', desc?.ru?.substring(0, 60));
  }

  // Also check quickie
  const { data: quickie } = await supabase
    .from('scenes')
    .select('slug, category, is_active')
    .ilike('slug', '%quickie%');

  console.log('\n\nQuickie scenes:');
  for (const s of quickie || []) {
    console.log(' -', s.slug, '| category:', s.category, '| active:', s.is_active);
  }
}
run();

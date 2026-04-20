import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, is_active')
    .or('slug.ilike.%ice%,slug.ilike.%dildo%')
    .order('slug');

  console.log('=== Ice scenes ===');
  data?.filter(s => s.slug.includes('ice')).forEach(s =>
    console.log(' ', s.slug, '-', s.category, s.is_active ? '' : '(inactive)'));

  console.log('\n=== Dildo scenes ===');
  data?.filter(s => s.slug.includes('dildo')).forEach(s =>
    console.log(' ', s.slug, '-', s.category, s.is_active ? '' : '(inactive)'));
}

run();

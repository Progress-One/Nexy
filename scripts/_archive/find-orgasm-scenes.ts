import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, title, is_active, category')
    .or('slug.ilike.%orgasm%,slug.ilike.%edging%,slug.ilike.%forced%,slug.ilike.%ruined%')
    .order('slug');

  console.log('Orgasm-related scenes:');
  for (const s of scenes || []) {
    const title = (s.title as any)?.ru || '';
    const status = s.is_active ? '✅' : '❌';
    console.log(`${status} ${s.slug} (${s.category}) - ${title}`);
  }
}

run();

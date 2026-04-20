import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, role_direction, user_description')
    .ilike('slug', 'ice-play%')
    .eq('is_active', true)
    .order('slug');

  for (const s of data || []) {
    console.log('='.repeat(60));
    console.log('SLUG:', s.slug);
    console.log('role_direction:', s.role_direction);
    console.log('RU:', s.user_description?.ru);
  }
}
run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active, user_description')
    .or('slug.ilike.%quick%,slug.ilike.%spontaneous%,slug.ilike.%fast%');

  console.log('Found', data?.length, 'scenes:\n');
  for (const s of data || []) {
    const desc = s.user_description as any;
    console.log(s.slug, '| active:', s.is_active);
    console.log('  RU:', desc?.ru?.substring(0, 80));
    console.log('  EN:', desc?.en?.substring(0, 80));
    console.log('');
  }
}
run();

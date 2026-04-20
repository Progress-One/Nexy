import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', '%public%');

  console.log('Public scenes:');
  data?.forEach(s => console.log(' ', s.slug, '| active:', s.is_active));
}

check().catch(console.error);

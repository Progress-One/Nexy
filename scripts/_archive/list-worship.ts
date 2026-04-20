import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, name, user_description')
    .eq('category', 'worship-service')
    .neq('is_active', false)
    .order('slug');

  console.log(`=== WORSHIP-SERVICE SCENES (${data?.length}) ===\n`);

  data?.forEach(s => {
    console.log('---');
    console.log('SLUG:', s.slug);
    console.log('NAME:', s.name?.ru || s.name?.en);
    console.log('RU:', s.user_description?.ru);
    console.log('EN:', s.user_description?.en);
    console.log('');
  });
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .eq('category', 'worship-service');

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log(`=== WORSHIP-SERVICE SCENES (${data?.length || 0}) ===\n`);

  data?.forEach(s => {
    console.log('SLUG:', s.slug);
    console.log('RU:', s.user_description?.ru);
    console.log('EN:', s.user_description?.en);
    console.log('---');
  });
}

check();

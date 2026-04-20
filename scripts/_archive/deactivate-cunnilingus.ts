import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .ilike('slug', 'glory-hole-cunnilingus%')
    .select('slug, is_active');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Deactivated:');
    for (const s of data || []) {
      console.log(`  ${s.slug}`);
    }
  }
}

run();

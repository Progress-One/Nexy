import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Deactivate glory-hole-blowjob base (was intentionally deactivated before)
  const { error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'glory-hole-blowjob');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Deactivated glory-hole-blowjob base');
  }

  // Verify
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', 'glory-hole-blowjob%');

  console.log('\nGlory-hole-blowjob status:');
  for (const s of data || []) {
    console.log(`  ${s.is_active ? '✅' : '❌'} ${s.slug}`);
  }
}

run();

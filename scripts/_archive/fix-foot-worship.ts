import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const slugsToActivate = [
    'foot-worship-he-worships-her',
    'foot-worship-she-worships-his',
  ];

  console.log('Reactivating foot-worship base scenes...\n');

  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: true })
    .in('slug', slugsToActivate)
    .select('slug, is_active');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log(`Reactivated ${data?.length || 0} scenes:`);
    for (const s of data || []) {
      console.log(`  ✅ ${s.slug}`);
    }
  }
}

run();

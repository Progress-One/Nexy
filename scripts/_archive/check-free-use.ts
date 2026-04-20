import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .ilike('slug', '%free-use%');

  console.log('Free-use scenes:');
  for (const s of data || []) {
    console.log(`  ${s.slug}: shared_images_with = ${s.shared_images_with}`);
  }
}

run();

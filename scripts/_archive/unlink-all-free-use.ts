import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Clear shared_images_with for ALL free-use scenes (including -give/-receive)
  const { data, error } = await supabase
    .from('scenes')
    .update({ shared_images_with: null })
    .ilike('slug', '%free-use%')
    .select('slug, shared_images_with');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Removed shared_images_with from ALL free-use scenes:');
    for (const s of data || []) {
      console.log(`  ${s.slug}: ${s.shared_images_with}`);
    }
  }
}

run();

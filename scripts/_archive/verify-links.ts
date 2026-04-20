import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verify() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .or('slug.ilike.%collar%,slug.ilike.%lingerie%')
    .not('slug', 'ilike', '%onboarding%');

  console.log('Current state:');
  for (const s of data || []) {
    console.log(`  ${s.slug}: shared_images_with = ${s.shared_images_with || 'null'}`);
  }
}

verify();

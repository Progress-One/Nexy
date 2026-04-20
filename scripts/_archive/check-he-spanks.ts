import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Find all scenes with "he spanks her" pattern
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_variants, shared_images_with')
    .or('slug.ilike.%spanking-he%,slug.ilike.%onboarding-rough-give-hetero-m%,slug.ilike.%onboarding-rough-receive-hetero-f%');

  console.log('He spanks her scenes:\n');

  for (const s of data || []) {
    const v = s.image_variants?.filter((x: any) => !x.is_placeholder)?.length || 0;
    const shared = s.shared_images_with ? 'SHARED' : '';
    console.log(`${s.slug}: variants=${v} ${shared}`);
  }
}

check();

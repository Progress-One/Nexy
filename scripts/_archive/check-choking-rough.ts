import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants, shared_images_with')
    .or('slug.ilike.%chok%,slug.ilike.%onboarding-rough%');

  console.log('Choking & Rough scenes:\n');

  for (const s of data || []) {
    const variants = s.image_variants?.filter((v: any) => !v.is_placeholder)?.length || 0;
    const shared = s.shared_images_with ? 'SHARED' : '';
    console.log(`${s.slug}: img=${s.image_url ? 'yes' : 'no'}, variants=${variants} ${shared}`);
  }
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants, shared_images_with')
    .or('slug.ilike.%spanking-she%,slug.ilike.%onboarding-rough%');

  console.log('Spanking-she vs Onboarding-rough:\n');

  for (const s of data || []) {
    const variants = s.image_variants?.filter((v: any) => !v.is_placeholder)?.length || 0;
    console.log(`${s.slug}:`);
    console.log(`  image: ${s.image_url ? 'YES' : 'no'}, variants: ${variants}`);
  }
}

check();

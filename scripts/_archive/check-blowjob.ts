import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with, image_url')
    .or('slug.ilike.%blowjob%,slug.eq.onboarding-oral-give,slug.eq.onboarding-oral-receive');

  console.log('Oral/Blowjob scenes:\n');

  for (const s of data || []) {
    let pairSlug = 'none';
    if (s.paired_with) {
      const { data: pair } = await supabase.from('scenes').select('slug').eq('id', s.paired_with).single();
      pairSlug = pair?.slug || 'unknown';
    }
    console.log(`${s.slug}:`);
    console.log(`  paired_with: ${pairSlug}`);
    console.log(`  has_image: ${!!s.image_url}`);
    console.log();
  }
}

check();

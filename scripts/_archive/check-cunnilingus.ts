import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with, shared_images_with, image_url')
    .or('slug.ilike.%cunnilingus%,slug.ilike.%oral%');

  console.log('Cunnilingus/Oral scenes:\n');

  for (const s of data || []) {
    console.log(`${s.slug}:`);
    console.log(`  id: ${s.id}`);
    console.log(`  has_image: ${!!s.image_url}`);
    console.log(`  paired_with: ${s.paired_with || 'none'}`);
    console.log(`  shared_images_with: ${s.shared_images_with || 'none'}`);
    console.log();
  }
}

check();

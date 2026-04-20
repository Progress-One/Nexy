import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, paired_with, shared_images_with, image_url, image_variants')
    .ilike('slug', '%spank%');

  for (const s of data || []) {
    const variants = s.image_variants?.length || 0;
    const sharedId = s.shared_images_with;
    let sharedSlug = 'none';
    if (sharedId) {
      const source = data?.find(x => x.slug.includes('spank') && data?.find(y => y.slug === x.slug)?.slug);
      // Find by ID in all scenes
      const { data: src } = await supabase.from('scenes').select('slug').eq('id', sharedId).single();
      sharedSlug = src?.slug || sharedId;
    }

    console.log(`${s.slug}:`);
    console.log(`  paired: ${s.paired_with ? 'yes' : 'no'}`);
    console.log(`  shared_from: ${sharedSlug}`);
    console.log(`  image: ${s.image_url ? 'yes' : 'no'}`);
    console.log(`  variants: ${variants}`);
    console.log();
  }
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, is_active, image_url, image_variants, shared_images_with')
    .ilike('slug', '%glory%')
    .order('slug');

  for (const s of scenes || []) {
    console.log('\n=== ' + s.slug + ' ===');
    console.log('is_active:', s.is_active);
    console.log('shared_images_with:', s.shared_images_with || '(none)');
    
    const variants = s.image_variants || [];
    console.log('image_variants count:', variants.length);
    if (variants.length > 0) {
      for (const v of variants) {
        console.log('  - ' + (v.url || v.image_url || JSON.stringify(v)).substring(0, 80));
      }
    }
  }
}

run();

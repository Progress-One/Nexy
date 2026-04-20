import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const slug = process.argv[2];

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!data) {
    console.log('Scene not found:', slug);
    return;
  }

  console.log('slug:', data.slug);
  console.log('is_active:', data.is_active);
  console.log('category:', data.category);
  console.log('image_url:', data.image_url ? 'yes' : 'no');
  console.log('shared_images_with:', data.shared_images_with || '(none)');
  console.log('image_variants:', (data.image_variants || []).length);
  
  if (data.image_variants?.length > 0) {
    console.log('\nVariants:');
    for (const v of data.image_variants) {
      console.log('  -', v.url?.substring(0, 60) || JSON.stringify(v));
    }
  }
}

run();

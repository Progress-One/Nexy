import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .ilike('slug', '%glory%')
    .order('slug');

  for (const s of scenes || []) {
    console.log('\n--- ' + s.slug + ' ---');
    console.log('is_active:', s.is_active);
    console.log('image_url:', s.image_url || '(none)');
    
    // Check scene_images table
    const { data: images } = await supabase
      .from('scene_images')
      .select('id, image_url, position')
      .eq('scene_id', s.id);
    
    if (images && images.length > 0) {
      console.log('scene_images:', images.length);
      for (const img of images) {
        console.log('  - ' + img.image_url);
      }
    }
  }
}

run();

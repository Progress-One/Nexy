import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Check scene_images for glory hole scenes
  const { data: allImages } = await supabase
    .from('scene_images')
    .select('*, scenes!inner(slug)')
    .ilike('scenes.slug', '%glory%');

  console.log('scene_images for glory:', allImages?.length || 0);
  
  // Check if there's a gallery table
  const { data: tables } = await supabase.rpc('get_tables') as any;
  console.log('\nLooking for gallery-related tables...');
  
  // Let's check scene_images for any scene to understand the structure
  const { data: sampleImages } = await supabase
    .from('scene_images')
    .select('*')
    .limit(5);
  
  console.log('\nSample scene_images:', sampleImages?.length || 0);
  if (sampleImages && sampleImages.length > 0) {
    console.log('First image:', JSON.stringify(sampleImages[0], null, 2));
  }
}

run();

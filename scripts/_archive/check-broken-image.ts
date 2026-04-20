import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const sceneId = 'd60996ef-5643-44eb-bd2e-974b6ee30baa';

  const { data } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants, paired_with')
    .eq('id', sceneId)
    .single();

  console.log('Scene:', data?.slug);
  console.log('image_url:', data?.image_url);
  console.log('paired_with:', data?.paired_with);
  console.log('variants count:', (data?.image_variants || []).length);

  // Check paired scene
  if (data?.paired_with) {
    const { data: paired } = await supabase
      .from('scenes')
      .select('id, slug, image_url, image_variants')
      .eq('id', data.paired_with)
      .single();

    console.log('\nPaired scene:', paired?.slug);
    console.log('paired image_url:', paired?.image_url);
    console.log('paired variants count:', (paired?.image_variants || []).length);

    // If paired has image but this doesn't, fix it
    if (paired?.image_url && !data?.image_url) {
      console.log('\nFIXING: Copying image_url from paired scene...');
      await supabase
        .from('scenes')
        .update({ image_url: paired.image_url })
        .eq('id', sceneId);
      console.log('DONE');
    }
  }

  // List all variants
  console.log('\n=== VARIANTS ===');
  for (const v of (data?.image_variants || [])) {
    console.log(`- ${v.url?.substring(0, 80)}...`);
  }
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Check if anything points TO free-use-f-available
  const { data: reverse } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .eq('shared_images_with', 'f6741988-6e77-4240-a100-3e5372278c92');

  console.log('Scenes pointing TO free-use-f-available:');
  console.log(reverse || 'none');

  // Also check onboarding-power-sub-hetero-f
  const { data: powerSub } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .eq('slug', 'onboarding-power-sub-hetero-f');

  console.log('\nonboarding-power-sub-hetero-f shared_images_with:');
  console.log(powerSub?.[0]?.shared_images_with || 'null');
}

run();

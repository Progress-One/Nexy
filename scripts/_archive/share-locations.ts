import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get source scene ID
  const { data: source } = await supabase
    .from('scenes')
    .select('id, slug, image_variants')
    .eq('slug', 'onboarding-quickie')
    .single();

  if (!source) {
    console.log('Source not found');
    return;
  }

  console.log('Source:', source.slug, '- variants:', source.image_variants?.length || 0);

  // Set sex-locations to share with onboarding-quickie
  const { error } = await supabase
    .from('scenes')
    .update({ shared_images_with: source.id })
    .eq('slug', 'sex-locations');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Set sex-locations to share images with onboarding-quickie');
  }
}

run();

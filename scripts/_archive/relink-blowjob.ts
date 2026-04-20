import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function relink() {
  // Get scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants')
    .in('slug', ['blowjob', 'onboarding-oral-give-hetero-f']);

  const blowjob = scenes?.find(s => s.slug === 'blowjob');
  const source = scenes?.find(s => s.slug === 'onboarding-oral-give-hetero-f');

  if (!blowjob || !source) {
    console.log('Scenes not found!');
    return;
  }

  console.log('blowjob id:', blowjob.id);
  console.log('source id:', source.id);
  console.log('source variants:', source.image_variants?.length || 0);
  console.log('source image_url:', source.image_url ? 'yes' : 'no');

  // Relink blowjob -> onboarding-oral-give-hetero-f
  const { error } = await supabase
    .from('scenes')
    .update({
      shared_images_with: source.id,
      image_url: source.image_url,
    })
    .eq('id', blowjob.id);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('\nRelinked blowjob -> onboarding-oral-give-hetero-f');
  }
}

relink();

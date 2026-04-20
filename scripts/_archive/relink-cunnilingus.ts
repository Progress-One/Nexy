import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function relink() {
  // Get scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url, image_variants')
    .in('slug', ['cunnilingus', 'onboarding-oral-give-hetero-m']);

  const cunnilingus = scenes?.find(s => s.slug === 'cunnilingus');
  const source = scenes?.find(s => s.slug === 'onboarding-oral-give-hetero-m');

  if (!cunnilingus || !source) {
    console.log('Scenes not found!');
    return;
  }

  console.log('cunnilingus id:', cunnilingus.id);
  console.log('source id:', source.id);
  console.log('source variants:', source.image_variants?.length || 0);
  console.log('source image_url:', source.image_url ? 'yes' : 'no');

  // Relink cunnilingus -> onboarding-oral-give-hetero-m
  const { error } = await supabase
    .from('scenes')
    .update({
      shared_images_with: source.id,
      image_url: source.image_url,
    })
    .eq('id', cunnilingus.id);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('\nRelinked cunnilingus -> onboarding-oral-give-hetero-m');
  }
}

relink();

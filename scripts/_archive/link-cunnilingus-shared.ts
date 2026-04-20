import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  // Get the scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url')
    .in('slug', ['cunnilingus', 'cunnilingus-give']);

  const cunnilingus = scenes?.find(s => s.slug === 'cunnilingus');
  const cunnilingusGive = scenes?.find(s => s.slug === 'cunnilingus-give');

  if (!cunnilingus || !cunnilingusGive) {
    console.log('Scenes not found!');
    return;
  }

  console.log('cunnilingus id:', cunnilingus.id);
  console.log('cunnilingus-give id:', cunnilingusGive.id);
  console.log('cunnilingus-give image_url:', cunnilingusGive.image_url);

  // Link cunnilingus -> cunnilingus-give via shared_images_with
  // And copy the image_url
  const { error } = await supabase
    .from('scenes')
    .update({
      shared_images_with: cunnilingusGive.id,
      image_url: cunnilingusGive.image_url,
    })
    .eq('id', cunnilingus.id);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('\nLinked cunnilingus -> cunnilingus-give');
    console.log('Copied image_url to cunnilingus');
  }
}

link();

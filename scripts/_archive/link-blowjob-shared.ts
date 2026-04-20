import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  // Get the scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url')
    .in('slug', ['blowjob', 'blowjob-give']);

  const blowjob = scenes?.find(s => s.slug === 'blowjob');
  const blowjobGive = scenes?.find(s => s.slug === 'blowjob-give');

  if (!blowjob || !blowjobGive) {
    console.log('Scenes not found!');
    return;
  }

  console.log('blowjob id:', blowjob.id);
  console.log('blowjob-give id:', blowjobGive.id);
  console.log('blowjob-give image_url:', blowjobGive.image_url);

  // Link blowjob -> blowjob-give via shared_images_with
  // And copy the image_url
  const { error } = await supabase
    .from('scenes')
    .update({
      shared_images_with: blowjobGive.id,
      image_url: blowjobGive.image_url,
    })
    .eq('id', blowjob.id);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('\nLinked blowjob -> blowjob-give');
    console.log('Copied image_url to blowjob');
  }
}

link();

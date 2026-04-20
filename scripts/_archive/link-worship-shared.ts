import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  const pairs = [
    { target: 'pussy-worship', source: 'pussy-worship-give' },
    { target: 'cock-worship', source: 'cock-worship-give' },
  ];

  for (const { target, source } of pairs) {
    // Get scenes
    const { data: scenes } = await supabase
      .from('scenes')
      .select('id, slug, image_url')
      .in('slug', [target, source]);

    const targetScene = scenes?.find(s => s.slug === target);
    const sourceScene = scenes?.find(s => s.slug === source);

    if (!targetScene || !sourceScene) {
      console.log(`Skipping ${target}: scenes not found`);
      continue;
    }

    console.log(`Linking ${target} -> ${source}`);
    console.log(`  source image_url: ${sourceScene.image_url ? 'yes' : 'no'}`);

    // Link target -> source
    const { error } = await supabase
      .from('scenes')
      .update({
        shared_images_with: sourceScene.id,
        image_url: sourceScene.image_url,
      })
      .eq('id', targetScene.id);

    if (error) {
      console.log(`  Error: ${error.message}`);
    } else {
      console.log(`  Done!`);
    }
  }
}

link();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function find() {
  // Get all scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, category, image_url, shared_images_with');

  if (!scenes) return;

  // Find scenes without images and no shared_images_with
  const noImage = scenes.filter(s => !s.image_url && !s.shared_images_with);

  console.log('Scenes without images and not sharing:\n');

  for (const s of noImage) {
    // Check if there's a -give version
    const giveSlug = s.slug + '-give';
    const giveScene = scenes.find(x => x.slug === giveSlug);

    if (giveScene?.image_url) {
      console.log(`${s.slug} [${s.category}] -> can share from ${giveSlug}`);
    } else {
      console.log(`${s.slug} [${s.category}] -> NO source found`);
    }
  }
}

find();

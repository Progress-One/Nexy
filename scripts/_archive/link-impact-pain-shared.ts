import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  // Scenes without images that should share from their -give versions
  const pairs = [
    // impact-pain
    { target: 'choking-he-chokes-her', source: 'choking-he-chokes-her-give' },
    { target: 'choking-she-chokes-him', source: 'choking-she-chokes-him-give' },
    { target: 'spanking-he-spanks-her', source: 'spanking-he-spanks-her-give' },
    { target: 'spanking-she-spanks-him', source: 'spanking-she-spanks-him-give' },
    { target: 'face-slapping-he-slaps-her', source: 'face-slapping-he-slaps-her-give' },
    { target: 'face-slapping-she-slaps-him', source: 'face-slapping-she-slaps-him-give' },
    { target: 'wax-play-he-on-her', source: 'wax-play-he-on-her-give' },
    { target: 'wax-play-she-on-him', source: 'wax-play-she-on-him-give' },
    { target: 'nipple-play-he-on-her', source: 'nipple-play-he-on-her-give' },
    { target: 'nipple-play-she-on-him', source: 'nipple-play-she-on-him-give' },
    { target: 'whipping-m-to-f', source: 'whipping-m-to-f-give' },
    { target: 'whipping-f-to-m', source: 'whipping-f-to-m-give' },
    { target: 'cbt', source: 'cbt-give' },
  ];

  // Get all slugs
  const allSlugs = pairs.flatMap(p => [p.target, p.source]);
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, image_url')
    .in('slug', allSlugs);

  if (!scenes) {
    console.log('No scenes found');
    return;
  }

  const slugToScene: Record<string, typeof scenes[0]> = {};
  for (const s of scenes) {
    slugToScene[s.slug] = s;
  }

  let linked = 0;
  for (const { target, source } of pairs) {
    const targetScene = slugToScene[target];
    const sourceScene = slugToScene[source];

    if (!targetScene) {
      console.log(`Skip ${target}: not found`);
      continue;
    }
    if (!sourceScene) {
      console.log(`Skip ${target}: source ${source} not found`);
      continue;
    }
    if (!sourceScene.image_url) {
      console.log(`Skip ${target}: source ${source} has no image`);
      continue;
    }

    const { error } = await supabase
      .from('scenes')
      .update({
        shared_images_with: sourceScene.id,
        image_url: sourceScene.image_url,
      })
      .eq('id', targetScene.id);

    if (error) {
      console.log(`Error ${target}: ${error.message}`);
    } else {
      console.log(`Linked ${target} -> ${source}`);
      linked++;
    }
  }

  console.log(`\nLinked ${linked} scenes`);
}

link();

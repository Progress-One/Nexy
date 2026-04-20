import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function link() {
  const pairs = [
    { target: 'cock-ring', source: 'cock-ring-give' },
    { target: 'degradation-he-degrades-her', source: 'degradation-he-degrades-her-give' },
    { target: 'objectification-m', source: 'objectification-m-give' },
    { target: 'facesitting-he-on-her', source: 'facesitting-he-on-her-give' },
    { target: 'mummification-m', source: 'mummification-m-give' },
    { target: 'objectification-f', source: 'objectification-f-give' },
    { target: 'massage-he-massages-her', source: 'massage-he-massages-her-give' },
    { target: 'rimming-he-to-her', source: 'rimming-he-to-her-give' },
    { target: 'fingering', source: 'fingering-give' },
    { target: 'teacher-m-student-f', source: 'teacher-m-student-f-give' },
    { target: 'boss-f-subordinate-m', source: 'boss-f-subordinate-m-give' },
    { target: 'praise-she-praises-him', source: 'praise-she-praises-him-give' },
    { target: 'deepthroat', source: 'deepthroat-give' },
    { target: 'boss-m-secretary-f', source: 'boss-m-secretary-f-give' },
    { target: 'body-worship-he-worships-her', source: 'body-worship-he-worships-her-give' },
    { target: 'body-worship-she-worships-him', source: 'body-worship-she-worships-him-give' },
    { target: 'praise-he-praises-her', source: 'praise-he-praises-her-give' },
    { target: 'degradation-she-degrades-him', source: 'degradation-she-degrades-him-give' },
    { target: 'foot-worship-she-worships-his', source: 'foot-worship-she-worships-his-give' },
    { target: 'foot-worship-he-worships-her', source: 'foot-worship-he-worships-her-give' },
    { target: 'handjob', source: 'handjob-give' },
    { target: 'massage-she-massages-him', source: 'massage-she-massages-him-give' },
    { target: 'rimming-she-to-him', source: 'rimming-she-to-him-give' },
    { target: 'teacher-f-student-m', source: 'teacher-f-student-m-give' },
  ];

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

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Cross-category pairs that share the same visual
const sharedImagePairs = [
  // Foot: onboarding ↔ worship-service (he worships her feet)
  ['onboarding-foot-give-hetero-m', 'foot-worship-he-worships-her-give'],
  ['onboarding-foot-receive-hetero-f', 'foot-worship-he-worships-her-receive'],
  // Foot: onboarding ↔ worship-service (she worships his feet)
  ['onboarding-foot-give-hetero-f', 'foot-worship-she-worships-his-give'],
  ['onboarding-foot-receive-hetero-m', 'foot-worship-she-worships-his-receive'],

  // Oral ↔ Cock-worship (blowjob)
  ['onboarding-oral-give-hetero-f', 'cock-worship-give'],
  ['onboarding-oral-receive-hetero-m', 'cock-worship-receive'],

  // Oral ↔ Pussy-worship (cunnilingus)
  ['onboarding-oral-give-hetero-m', 'pussy-worship-give'],
  ['onboarding-oral-receive-hetero-f', 'pussy-worship-receive'],
];

async function link() {
  // Get all scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug');

  if (!scenes) {
    console.log('No scenes found');
    return;
  }

  const slugToId: Record<string, string> = {};
  scenes.forEach(s => slugToId[s.slug] = s.id);

  console.log('=== LINKING SHARED IMAGES ===\n');

  for (const [slug1, slug2] of sharedImagePairs) {
    const id1 = slugToId[slug1];
    const id2 = slugToId[slug2];

    if (!id1) {
      console.log(`SKIP: ${slug1} not found`);
      continue;
    }
    if (!id2) {
      console.log(`SKIP: ${slug2} not found`);
      continue;
    }

    // Link both ways
    const { error: err1 } = await supabase
      .from('scenes')
      .update({ shared_images_with: id2 })
      .eq('id', id1);

    const { error: err2 } = await supabase
      .from('scenes')
      .update({ shared_images_with: id1 })
      .eq('id', id2);

    if (err1 || err2) {
      console.log(`ERROR: ${slug1} ↔ ${slug2}: ${err1?.message || err2?.message}`);
    } else {
      console.log(`LINKED: ${slug1} ↔ ${slug2}`);
    }
  }

  console.log('\n=== DONE ===');
}

link();

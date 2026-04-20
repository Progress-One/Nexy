import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Pairs: [onboarding, verbal]
const PRAISE_PAIRS = [
  ['onboarding-praise-give-hetero-m', 'praise-he-praises-her-give'],
  ['onboarding-praise-give-hetero-f', 'praise-she-praises-him-give'],
];

async function link() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, shared_images_with');

  if (!scenes) {
    console.log('No scenes found');
    return;
  }

  const bySlug: Record<string, typeof scenes[0]> = {};
  scenes.forEach(s => bySlug[s.slug] = s);

  for (const [onboarding, verbal] of PRAISE_PAIRS) {
    const ob = bySlug[onboarding];
    const vb = bySlug[verbal];

    if (!ob || !vb) {
      console.log(`SKIP: ${onboarding} or ${verbal} not found`);
      continue;
    }

    console.log(`\nLINKING: ${onboarding} <-> ${verbal}`);

    // Link both ways
    await supabase
      .from('scenes')
      .update({ shared_images_with: vb.id })
      .eq('id', ob.id);

    await supabase
      .from('scenes')
      .update({ shared_images_with: ob.id })
      .eq('id', vb.id);

    console.log(`  DONE`);
  }

  console.log('\n=== FINISHED ===');
}

link();

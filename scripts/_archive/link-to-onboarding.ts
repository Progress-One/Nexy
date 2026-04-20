import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Discovery scene → Onboarding scene (source of images)
const linksToCreate = [
  { target: 'collar-she-owns-him', source: 'onboarding-power-dom-hetero-f' },
  { target: 'collar-he-owns-her', source: 'onboarding-power-dom-hetero-m' },
  { target: 'pegging', source: 'onboarding-anal-give-hetero-f' },
  { target: 'cum-where-to-finish', source: 'onboarding-body-fluids-give-hetero-m' },
  { target: 'squirt-receiving', source: 'onboarding-body-fluids-give-hetero-f' },
  { target: 'female-lingerie', source: 'onboarding-lingerie-receive-hetero-m' },
];

async function linkScenes() {
  console.log('=== LINKING DISCOVERY → ONBOARDING ===\n');

  // Get all scene IDs
  const allSlugs = linksToCreate.flatMap(l => [l.target, l.source]);
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug')
    .in('slug', allSlugs);

  if (!scenes) {
    console.log('Error: Could not fetch scenes');
    return;
  }

  const bySlug = new Map(scenes.map(s => [s.slug, s.id]));

  for (const link of linksToCreate) {
    const targetId = bySlug.get(link.target);
    const sourceId = bySlug.get(link.source);

    if (!targetId || !sourceId) {
      console.log(`❌ ${link.target} → ${link.source}: Scene not found`);
      continue;
    }

    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: sourceId })
      .eq('id', targetId);

    if (error) {
      console.log(`❌ ${link.target} → ${link.source}: ${error.message}`);
    } else {
      console.log(`✅ ${link.target} → ${link.source}`);
    }
  }

  console.log('\n=== DONE ===');
}

linkScenes();

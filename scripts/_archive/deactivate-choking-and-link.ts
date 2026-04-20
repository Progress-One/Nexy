import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // 1. Deactivate choking scenes
  console.log('=== DEACTIVATING CHOKING SCENES ===\n');

  const { data: chokingScenes } = await supabase
    .from('scenes')
    .select('id, slug, is_active')
    .ilike('slug', 'choking%');

  if (chokingScenes && chokingScenes.length > 0) {
    const ids = chokingScenes.map(s => s.id);
    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('id', ids);

    if (error) {
      console.log('Error deactivating:', error.message);
    } else {
      console.log(`Deactivated ${ids.length} choking scenes:`);
      for (const s of chokingScenes) {
        console.log(`  - ${s.slug}`);
      }
    }
  }

  // 2. Link breath-play and striptease to onboarding
  console.log('\n=== LINKING TO ONBOARDING ===\n');

  const linksToCreate = [
    { target: 'breath-play-m-to-f', source: 'onboarding-extreme-give-hetero-m' },
    { target: 'breath-play-m-to-f-give', source: 'onboarding-extreme-give-hetero-m' },
    { target: 'breath-play-m-to-f-receive', source: 'onboarding-extreme-give-hetero-m' },
    { target: 'breath-play-f-to-m', source: 'onboarding-extreme-give-hetero-f' },
    { target: 'breath-play-f-to-m-give', source: 'onboarding-extreme-give-hetero-f' },
    { target: 'breath-play-f-to-m-receive', source: 'onboarding-extreme-give-hetero-f' },
    { target: 'male-striptease', source: 'onboarding-exhibitionism-hetero-f' },
    { target: 'male-striptease-give', source: 'onboarding-exhibitionism-hetero-f' },
    { target: 'male-striptease-receive', source: 'onboarding-exhibitionism-hetero-f' },
    { target: 'female-striptease', source: 'onboarding-exhibitionism-hetero-m' },
    { target: 'female-striptease-give', source: 'onboarding-exhibitionism-hetero-m' },
    { target: 'female-striptease-receive', source: 'onboarding-exhibitionism-hetero-m' },
  ];

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

    if (!targetId) {
      console.log(`⏭ ${link.target}: not found`);
      continue;
    }
    if (!sourceId) {
      console.log(`❌ ${link.target} → ${link.source}: source not found`);
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

main();

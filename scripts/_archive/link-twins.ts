import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function linkTwins() {
  const linksToCreate = [
    // BONDAGE - she ties him (f_to_m)
    { target: 'bondage-she-ties-him', source: 'onboarding-bondage-give-hetero-f' },
    { target: 'bondage-she-ties-him-give', source: 'onboarding-bondage-give-hetero-f' },
    { target: 'bondage-she-ties-him-receive', source: 'onboarding-bondage-give-hetero-f' },

    // BONDAGE - he ties her (m_to_f)
    { target: 'bondage-he-ties-her', source: 'onboarding-bondage-give-hetero-m' },
    { target: 'bondage-he-ties-her-give', source: 'onboarding-bondage-give-hetero-m' },
    { target: 'bondage-he-ties-her-receive', source: 'onboarding-bondage-give-hetero-m' },

    // FREE-USE - she available (m_to_f) → power-sub-f
    { target: 'free-use-f-available', source: 'onboarding-power-sub-hetero-f' },
    { target: 'free-use-f-available-give', source: 'onboarding-power-sub-hetero-f' },
    { target: 'free-use-f-available-receive', source: 'onboarding-power-sub-hetero-f' },

    // FREE-USE - he available (f_to_m) → power-sub-m
    { target: 'free-use-m-available', source: 'onboarding-power-sub-hetero-m' },
    { target: 'free-use-m-available-give', source: 'onboarding-power-sub-hetero-m' },
    { target: 'free-use-m-available-receive', source: 'onboarding-power-sub-hetero-m' },

    // HARNESS - female (m_to_f) → lingerie for her
    { target: 'female-harness', source: 'onboarding-lingerie-receive-hetero-m' },
    { target: 'female-harness-give', source: 'onboarding-lingerie-receive-hetero-m' },
    { target: 'female-harness-receive', source: 'onboarding-lingerie-receive-hetero-m' },

    // HARNESS - male (f_to_m) → male in leather harness
    { target: 'male-harness', source: 'onboarding-lingerie-give-hetero-m-alt' },
    { target: 'male-harness-give', source: 'onboarding-lingerie-give-hetero-m-alt' },
    { target: 'male-harness-receive', source: 'onboarding-lingerie-give-hetero-m-alt' },
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

  console.log('=== LINKING TWINS ===\n');

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

linkTwins();

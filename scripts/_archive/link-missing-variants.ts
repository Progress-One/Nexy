import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function linkMissing() {
  const linksToCreate = [
    // PEGGING variants (base was linked earlier)
    { target: 'pegging-give', source: 'onboarding-anal-give-hetero-f' },
    { target: 'pegging-receive', source: 'onboarding-anal-give-hetero-f' },

    // SQUIRT variants
    { target: 'squirt-receiving-give', source: 'onboarding-body-fluids-give-hetero-f' },
    { target: 'squirt-receiving-receive', source: 'onboarding-body-fluids-give-hetero-f' },

    // COLLAR variants
    { target: 'collar-he-owns-her-give', source: 'onboarding-power-dom-hetero-m' },
    { target: 'collar-he-owns-her-receive', source: 'onboarding-power-dom-hetero-m' },
    { target: 'collar-she-owns-him-give', source: 'onboarding-power-dom-hetero-f' },
    { target: 'collar-she-owns-him-receive', source: 'onboarding-power-dom-hetero-f' },

    // FEMALE LINGERIE variants
    { target: 'female-lingerie-give', source: 'onboarding-lingerie-receive-hetero-m' },
    { target: 'female-lingerie-receive', source: 'onboarding-lingerie-receive-hetero-m' },

    // MALE LINGERIE variants (if not linked)
    { target: 'male-lingerie-give', source: 'onboarding-lingerie-give-hetero-f' },
    { target: 'male-lingerie-receive', source: 'onboarding-lingerie-give-hetero-f' },
  ];

  // Get all scene IDs
  const allSlugs = linksToCreate.flatMap(l => [l.target, l.source]);
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, shared_images_with')
    .in('slug', allSlugs);

  if (!scenes) {
    console.log('Error: Could not fetch scenes');
    return;
  }

  const bySlug = new Map(scenes.map(s => [s.slug, { id: s.id, linked: s.shared_images_with }]));

  console.log('=== LINKING MISSING VARIANTS ===\n');

  for (const link of linksToCreate) {
    const targetInfo = bySlug.get(link.target);
    const sourceInfo = bySlug.get(link.source);

    if (!targetInfo) {
      console.log(`⏭ ${link.target}: not found`);
      continue;
    }
    if (targetInfo.linked) {
      console.log(`⏭ ${link.target}: already linked`);
      continue;
    }
    if (!sourceInfo) {
      console.log(`❌ ${link.target} → ${link.source}: source not found`);
      continue;
    }

    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: sourceInfo.id })
      .eq('id', targetInfo.id);

    if (error) {
      console.log(`❌ ${link.target} → ${link.source}: ${error.message}`);
    } else {
      console.log(`✅ ${link.target} → ${link.source}`);
    }
  }

  console.log('\n=== DONE ===');
}

linkMissing();

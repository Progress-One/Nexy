import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all blindfold scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug')
    .ilike('slug', '%blindfold%');

  if (!scenes || scenes.length === 0) {
    console.error('No blindfold scenes found');
    return;
  }

  const sceneMap = new Map(scenes.map(s => [s.slug, s.id]));

  console.log('Setting up paired_with...\n');

  // Pair 1: He's blindfolded
  // Primary: blindfold-on-him-give (has images)
  // Secondary: blindfold-on-her-receive (shares images, paired_with primary)
  const pair1Primary = sceneMap.get('blindfold-on-him-give');
  const pair1Secondary = 'blindfold-on-her-receive';

  // Pair 2: She's blindfolded
  // Primary: blindfold-on-her-give (has images)
  // Secondary: blindfold-on-him-receive (shares images, paired_with primary)
  const pair2Primary = sceneMap.get('blindfold-on-her-give');
  const pair2Secondary = 'blindfold-on-him-receive';

  // Set paired_with on secondary scenes
  const { error: err1 } = await supabase
    .from('scenes')
    .update({
      paired_with: pair1Primary,
      shared_images_with: pair1Primary
    })
    .eq('slug', pair1Secondary);

  if (err1) {
    console.error('Error pair 1:', err1.message);
  } else {
    console.log(`Pair 1 (man blindfolded):`);
    console.log(`  blindfold-on-him-give (primary)`);
    console.log(`  ${pair1Secondary} -> paired_with + shared_images_with`);
  }

  const { error: err2 } = await supabase
    .from('scenes')
    .update({
      paired_with: pair2Primary,
      shared_images_with: pair2Primary
    })
    .eq('slug', pair2Secondary);

  if (err2) {
    console.error('Error pair 2:', err2.message);
  } else {
    console.log(`\nPair 2 (woman blindfolded):`);
    console.log(`  blindfold-on-her-give (primary)`);
    console.log(`  ${pair2Secondary} -> paired_with + shared_images_with`);
  }

  // Verify
  console.log('\n--- Verification ---');
  const { data: check } = await supabase
    .from('scenes')
    .select('slug, paired_with, shared_images_with')
    .ilike('slug', '%blindfold%')
    .order('slug');

  for (const s of check || []) {
    const pairedSlug = s.paired_with ? scenes.find(sc => sc.id === s.paired_with)?.slug : null;
    const sharedSlug = s.shared_images_with ? scenes.find(sc => sc.id === s.shared_images_with)?.slug : null;

    console.log(`${s.slug}`);
    console.log(`  paired_with: ${pairedSlug || 'none (primary)'}`);
    console.log(`  shared_images_with: ${sharedSlug || 'none (has own images)'}`);
  }
}

run();

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

  // Pair 1: He's blindfolded (woman blindfolds man)
  // - blindfold-on-him-give = I (woman) blindfold him
  // - blindfold-on-her-receive = She (woman) blindfolds me (man)
  // Same image: man wearing blindfold
  const pair1Source = 'blindfold-on-him-give';
  const pair1Target = 'blindfold-on-her-receive';

  // Pair 2: She's blindfolded (man blindfolds woman)
  // - blindfold-on-her-give = I (man) blindfold her
  // - blindfold-on-him-receive = He (man) blindfolds me (woman)
  // Same image: woman wearing blindfold
  const pair2Source = 'blindfold-on-her-give';
  const pair2Target = 'blindfold-on-him-receive';

  console.log('Setting up pairs...\n');

  // Pair 1
  const { error: err1 } = await supabase
    .from('scenes')
    .update({ shared_images_with: sceneMap.get(pair1Source) })
    .eq('slug', pair1Target);

  if (err1) {
    console.error('Error pair 1:', err1.message);
  } else {
    console.log(`Pair 1 (man blindfolded):`);
    console.log(`  ${pair1Source} (source)`);
    console.log(`  ${pair1Target} -> shares from ${pair1Source}`);
  }

  // Pair 2
  const { error: err2 } = await supabase
    .from('scenes')
    .update({ shared_images_with: sceneMap.get(pair2Source) })
    .eq('slug', pair2Target);

  if (err2) {
    console.error('Error pair 2:', err2.message);
  } else {
    console.log(`\nPair 2 (woman blindfolded):`);
    console.log(`  ${pair2Source} (source)`);
    console.log(`  ${pair2Target} -> shares from ${pair2Source}`);
  }

  // Verify
  console.log('\n--- Verification ---');
  const { data: check } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .ilike('slug', '%blindfold%')
    .order('slug');

  for (const s of check || []) {
    if (s.shared_images_with) {
      const source = scenes.find(sc => sc.id === s.shared_images_with);
      console.log(`${s.slug} -> shares from ${source?.slug}`);
    } else {
      console.log(`${s.slug} (source - has own images)`);
    }
  }
}

run();

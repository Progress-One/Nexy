/**
 * Link give/receive scene pairs with paired_with field
 *
 * Run: npx tsx scripts/link-paired-scenes.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Linking give/receive scene pairs...\n');

  // Get all scenes ending with -give
  const { data: giveScenes, error } = await supabase
    .from('scenes')
    .select('id, slug')
    .like('slug', '%-give');

  if (error) {
    console.error('Error fetching scenes:', error);
    return;
  }

  console.log(`Found ${giveScenes?.length || 0} -give scenes\n`);

  let linked = 0;
  let notFound = 0;

  for (const giveScene of giveScenes || []) {
    // Find matching -receive scene
    const receiveSlug = giveScene.slug.replace(/-give$/, '-receive');

    const { data: receiveScene } = await supabase
      .from('scenes')
      .select('id, slug')
      .eq('slug', receiveSlug)
      .single();

    if (!receiveScene) {
      console.log(`No match for ${giveScene.slug}`);
      notFound++;
      continue;
    }

    // Link both scenes to each other
    const { error: err1 } = await supabase
      .from('scenes')
      .update({ paired_with: receiveScene.id })
      .eq('id', giveScene.id);

    const { error: err2 } = await supabase
      .from('scenes')
      .update({ paired_with: giveScene.id })
      .eq('id', receiveScene.id);

    if (err1 || err2) {
      console.log(`Error linking ${giveScene.slug}: ${err1?.message || err2?.message}`);
    } else {
      console.log(`Linked: ${giveScene.slug} <-> ${receiveSlug}`);
      linked++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Linked: ${linked} pairs`);
  console.log(`Not found: ${notFound}`);
}

main().catch(console.error);

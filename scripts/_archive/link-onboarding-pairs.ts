/**
 * Link onboarding give/receive scene pairs with paired_with field
 *
 * Onboarding scenes have format: onboarding-{category}-{give|receive}-hetero-{m|f}
 *
 * Run: npx tsx scripts/link-onboarding-pairs.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Linking onboarding give/receive scene pairs...\n');

  // Get all onboarding scenes with give in slug
  const { data: giveScenes, error } = await supabase
    .from('scenes')
    .select('id, slug')
    .eq('category', 'onboarding')
    .like('slug', '%-give-%');

  if (error) {
    console.error('Error fetching scenes:', error);
    return;
  }

  console.log(`Found ${giveScenes?.length || 0} onboarding -give- scenes\n`);

  let linked = 0;
  let notFound = 0;
  let alreadyLinked = 0;

  for (const giveScene of giveScenes || []) {
    // Check if already linked
    const { data: existing } = await supabase
      .from('scenes')
      .select('paired_with')
      .eq('id', giveScene.id)
      .single();

    if (existing?.paired_with) {
      alreadyLinked++;
      continue;
    }

    // Find matching receive scene
    // onboarding-foot-give-hetero-m -> onboarding-foot-receive-hetero-f
    // onboarding-foot-give-hetero-f -> onboarding-foot-receive-hetero-m
    const receiveSlug = giveScene.slug
      .replace('-give-', '-receive-')
      .replace(/-m$/, '-TEMP')
      .replace(/-f$/, '-m')
      .replace('-TEMP', '-f');

    const { data: receiveScene } = await supabase
      .from('scenes')
      .select('id, slug')
      .eq('slug', receiveSlug)
      .single();

    if (!receiveScene) {
      console.log(`No match for ${giveScene.slug} -> ${receiveSlug}`);
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
  console.log(`Already linked: ${alreadyLinked}`);
  console.log(`Not found: ${notFound}`);
}

main().catch(console.error);

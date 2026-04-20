import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function makeFollowup() {
  // Get all relevant scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, parent_scene_id')
    .or('slug.ilike.%spanking%,slug.ilike.%whipping%');

  console.log('Current state:\n');
  for (const s of scenes || []) {
    console.log(`${s.slug}: parent=${s.parent_scene_id ? 'yes' : 'no'}`);
  }

  // Find parent scenes (spanking base scenes)
  const spankingHe = scenes?.find(s => s.slug === 'spanking-he-spanks-her');
  const spankingShe = scenes?.find(s => s.slug === 'spanking-she-spanks-him');

  // Find whipping base scenes to make them follow-ups
  const whippingMtoF = scenes?.find(s => s.slug === 'whipping-m-to-f');
  const whippingFtoM = scenes?.find(s => s.slug === 'whipping-f-to-m');

  console.log('\nMaking whipping follow-ups to spanking...\n');

  // whipping-m-to-f -> follow-up to spanking-he-spanks-her
  if (whippingMtoF && spankingHe) {
    const { error } = await supabase
      .from('scenes')
      .update({ parent_scene_id: spankingHe.id })
      .eq('id', whippingMtoF.id);
    console.log(error ? `Error: ${error.message}` : `${whippingMtoF.slug} -> follow-up to ${spankingHe.slug}`);
  }

  // whipping-f-to-m -> follow-up to spanking-she-spanks-him
  if (whippingFtoM && spankingShe) {
    const { error } = await supabase
      .from('scenes')
      .update({ parent_scene_id: spankingShe.id })
      .eq('id', whippingFtoM.id);
    console.log(error ? `Error: ${error.message}` : `${whippingFtoM.slug} -> follow-up to ${spankingShe.slug}`);
  }
}

makeFollowup();

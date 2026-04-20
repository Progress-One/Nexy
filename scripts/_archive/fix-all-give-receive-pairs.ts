import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// All categories with give/receive pattern
const CATEGORIES = [
  'anal',
  'body-fluids',
  'dirty-talk',
  'foot',
  'oral',
  'praise',
  'rough',
];

async function fix() {
  // Get all onboarding scenes
  const { data } = await supabase
    .from('scenes')
    .select('id, slug')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  const scenes: Record<string, string> = {};
  data?.forEach(s => { scenes[s.slug] = s.id; });

  console.log('Fixing all give/receive pairs...\n');

  for (const cat of CATEGORIES) {
    const giveM = `onboarding-${cat}-give-hetero-m`;
    const giveF = `onboarding-${cat}-give-hetero-f`;
    const receiveM = `onboarding-${cat}-receive-hetero-m`;
    const receiveF = `onboarding-${cat}-receive-hetero-f`;

    // Check if all 4 scenes exist
    if (!scenes[giveM] || !scenes[giveF] || !scenes[receiveM] || !scenes[receiveF]) {
      console.log(`⚠️  ${cat}: Missing scenes, skipping`);
      console.log(`   giveM: ${scenes[giveM] ? '✓' : '✗'}, giveF: ${scenes[giveF] ? '✓' : '✗'}, receiveM: ${scenes[receiveM] ? '✓' : '✗'}, receiveF: ${scenes[receiveF] ? '✓' : '✗'}`);
      continue;
    }

    console.log(`${cat}:`);

    // Картинка "М → Ж": give-m ↔ receive-f
    console.log(`  give-m ↔ receive-f`);
    await supabase.from('scenes').update({ paired_with: scenes[receiveF] }).eq('id', scenes[giveM]);
    await supabase.from('scenes').update({ paired_with: scenes[giveM] }).eq('id', scenes[receiveF]);

    // Картинка "Ж → М": give-f ↔ receive-m
    console.log(`  give-f ↔ receive-m`);
    await supabase.from('scenes').update({ paired_with: scenes[receiveM] }).eq('id', scenes[giveF]);
    await supabase.from('scenes').update({ paired_with: scenes[giveF] }).eq('id', scenes[receiveM]);
  }

  console.log('\n✓ Done!\n');

  // Verify all
  console.log('Verification:');
  const { data: verify } = await supabase
    .from('scenes')
    .select('id, slug, paired_with')
    .eq('category', 'onboarding')
    .eq('is_active', true)
    .not('paired_with', 'is', null)
    .order('slug');

  verify?.forEach(s => {
    const paired = verify.find(v => v.id === s.paired_with);
    console.log(`  ${s.slug.replace('onboarding-', '')} → ${paired?.slug.replace('onboarding-', '') || 'none'}`);
  });
}

fix().catch(console.error);

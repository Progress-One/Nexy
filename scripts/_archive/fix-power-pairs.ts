import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  // Get all power scenes
  const { data } = await supabase
    .from('scenes')
    .select('id, slug')
    .ilike('slug', '%power%')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  const scenes: Record<string, string> = {};
  data?.forEach(s => { scenes[s.slug] = s.id; });

  console.log('Fixing power (dom/sub) pairs...\n');

  // Картинка "Ж доминирует над М": dom-f ↔ sub-m
  console.log('1. dom-hetero-f ↔ sub-hetero-m (картинка: Ж доминирует над М)');
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-power-sub-hetero-m'] }).eq('id', scenes['onboarding-power-dom-hetero-f']);
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-power-dom-hetero-f'] }).eq('id', scenes['onboarding-power-sub-hetero-m']);

  // Картинка "М доминирует над Ж": dom-m ↔ sub-f
  console.log('2. dom-hetero-m ↔ sub-hetero-f (картинка: М доминирует над Ж)');
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-power-sub-hetero-f'] }).eq('id', scenes['onboarding-power-dom-hetero-m']);
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-power-dom-hetero-m'] }).eq('id', scenes['onboarding-power-sub-hetero-f']);

  console.log('\n✓ Fixed!');

  // Verify
  const { data: verify } = await supabase
    .from('scenes')
    .select('id, slug, paired_with')
    .ilike('slug', '%power%')
    .eq('category', 'onboarding')
    .eq('is_active', true)
    .order('slug');

  console.log('\nVerification:');
  verify?.forEach(s => {
    const paired = verify.find(v => v.id === s.paired_with);
    console.log(`  ${s.slug} → ${paired?.slug || 'none'}`);
  });
}

fix().catch(console.error);

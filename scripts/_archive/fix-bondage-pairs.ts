import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  // Get all bondage scenes
  const { data } = await supabase
    .from('scenes')
    .select('id, slug')
    .ilike('slug', '%bondage%')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  const scenes: Record<string, string> = {};
  data?.forEach(s => { scenes[s.slug] = s.id; });

  console.log('Fixing bondage pairs...\n');

  // Картинка "М связывает Ж": give-m ↔ receive-f
  console.log('1. give-hetero-m ↔ receive-hetero-f (картинка: М связывает Ж)');
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-bondage-receive-hetero-f'] }).eq('id', scenes['onboarding-bondage-give-hetero-m']);
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-bondage-give-hetero-m'] }).eq('id', scenes['onboarding-bondage-receive-hetero-f']);

  // Картинка "Ж связывает М": give-f ↔ receive-m
  console.log('2. give-hetero-f ↔ receive-hetero-m (картинка: Ж связывает М)');
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-bondage-receive-hetero-m'] }).eq('id', scenes['onboarding-bondage-give-hetero-f']);
  await supabase.from('scenes').update({ paired_with: scenes['onboarding-bondage-give-hetero-f'] }).eq('id', scenes['onboarding-bondage-receive-hetero-m']);

  console.log('\n✓ Fixed!');

  // Verify
  const { data: verify } = await supabase
    .from('scenes')
    .select('id, slug, paired_with')
    .ilike('slug', '%bondage%')
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

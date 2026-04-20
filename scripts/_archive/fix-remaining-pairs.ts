import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Categories where hetero-m ↔ hetero-f (same situation, M→F action)
const SIMPLE_PAIRS = [
  'extreme',
  'lingerie',
  'romantic',
  'toys',
];

async function fix() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  const scenes: Record<string, string> = {};
  data?.forEach(s => { scenes[s.slug] = s.id; });

  console.log('Fixing remaining pairs...\n');

  for (const cat of SIMPLE_PAIRS) {
    const m = `onboarding-${cat}-hetero-m`;
    const f = `onboarding-${cat}-hetero-f`;

    if (!scenes[m] || !scenes[f]) {
      console.log(`⚠️  ${cat}: Missing scenes`);
      continue;
    }

    console.log(`${cat}: hetero-m ↔ hetero-f`);
    await supabase.from('scenes').update({ paired_with: scenes[f] }).eq('id', scenes[m]);
    await supabase.from('scenes').update({ paired_with: scenes[m] }).eq('id', scenes[f]);
  }

  console.log('\n✓ Done!');
}

fix().catch(console.error);

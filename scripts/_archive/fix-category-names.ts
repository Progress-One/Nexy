import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const RENAMES = [
  { from: 'age_play', to: 'age-play' },
  { from: 'body_fluids', to: 'body-fluids' },
  { from: 'intimacy_outside', to: 'intimacy-outside' },
  { from: 'pet_play', to: 'pet-play' },
];

async function fix() {
  console.log('Fixing category names...\n');

  for (const { from, to } of RENAMES) {
    const { data, error } = await supabase
      .from('scenes')
      .update({ category: to })
      .eq('category', from)
      .select('id');

    if (error) {
      console.log(`❌ ${from} → ${to}: ${error.message}`);
    } else {
      console.log(`✓ ${from} → ${to}: ${data?.length || 0} scenes updated`);
    }
  }

  console.log('\nDone!');
}

fix().catch(console.error);

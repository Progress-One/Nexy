import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Get all scenes where is_active is explicitly false
  const { data: inactive, error: err1 } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .eq('is_active', false)
    .order('slug');

  if (err1) {
    console.error('Error:', err1);
    return;
  }

  console.log('Explicitly inactive scenes (is_active = false):');
  inactive.forEach(s => console.log('  ' + s.slug));
  console.log('Total inactive:', inactive.length);

  // Get all active scenes
  const { data: active, error: err2 } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true)
    .order('slug');

  console.log('\nTotal active scenes:', active?.length || 0);
}

main();

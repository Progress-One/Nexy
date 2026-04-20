import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  console.log('Removing paired_with from bondage onboarding scenes...\n');

  const { error } = await supabase
    .from('scenes')
    .update({ paired_with: null })
    .ilike('slug', '%bondage%')
    .eq('category', 'onboarding');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('✓ Removed pairing from all bondage onboarding scenes');

  // Verify
  const { data } = await supabase
    .from('scenes')
    .select('slug, paired_with')
    .ilike('slug', '%bondage%')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  console.log('\nVerification:');
  data?.forEach(s => console.log('  ' + s.slug + ': paired_with =', s.paired_with));
}

fix().catch(console.error);

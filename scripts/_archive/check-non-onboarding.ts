import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, role_direction, paired_with, user_description, is_active')
    .neq('category', 'onboarding')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  console.log('Non-onboarding active scenes:\n');

  let currentCategory = '';
  data?.forEach(s => {
    if (s.category !== currentCategory) {
      currentCategory = s.category;
      console.log(`\n=== ${currentCategory} ===`);
    }
    console.log(`${s.slug}`);
    console.log(`  role: ${s.role_direction}, paired: ${s.paired_with ? 'yes' : 'no'}`);
    console.log(`  RU: ${s.user_description?.ru || '-'}`);
  });

  console.log('\n\nTotal:', data?.length);
}

check().catch(console.error);

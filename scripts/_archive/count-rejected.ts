import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, accepted')
    .eq('accepted', false);

  console.log('ALL REJECTED SCENES:', data?.length);

  const byCategory: Record<string, number> = {};
  data?.forEach(s => {
    byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  });
  console.log('By category:', byCategory);

  console.log('\nOnboarding rejected:');
  data?.filter(s => s.category === 'onboarding').forEach(s => {
    console.log(`  ${s.slug}`);
  });
}

check();

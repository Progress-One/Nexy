import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, count } = await supabase
    .from('scenes')
    .select('id, slug, version, is_active, category', { count: 'exact' })
    .eq('version', 2)
    .eq('is_active', true)
    .neq('category', 'onboarding')
    .limit(5);

  console.log('Total v2 active non-onboarding:', count);
  console.log('Sample:', data?.map(s => s.slug));

  // Check what categories exist
  const { data: cats } = await supabase
    .from('scenes')
    .select('category')
    .eq('version', 2)
    .eq('is_active', true);

  const catCounts: Record<string, number> = {};
  for (const s of cats || []) {
    catCounts[s.category] = (catCounts[s.category] || 0) + 1;
  }
  console.log('\nCategories:', catCounts);
}
run();

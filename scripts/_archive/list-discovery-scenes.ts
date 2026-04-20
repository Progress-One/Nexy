import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all non-onboarding active scenes
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, category')
    .neq('category', 'onboarding')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by category
  const byCategory: Record<string, string[]> = {};
  for (const s of data || []) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s.slug);
  }

  for (const [cat, slugs] of Object.entries(byCategory)) {
    console.log('\n=== ' + cat.toUpperCase() + ' ===');
    for (const slug of slugs) {
      console.log('  ' + slug);
    }
  }

  console.log('\n\nTotal scenes:', data?.length);
}

run();

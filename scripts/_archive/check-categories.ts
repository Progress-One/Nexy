import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('category')
    .eq('is_active', true);

  const cats: Record<string, number> = {};
  data?.forEach(s => {
    cats[s.category] = (cats[s.category] || 0) + 1;
  });

  console.log('All categories in DB:\n');
  Object.entries(cats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([cat, count]) => {
      console.log(`  ${cat.padEnd(25)} ${count} scenes`);
    });

  // Find duplicates (same base name with different separators)
  console.log('\n\nPotential duplicates (same base, different separator):');
  const normalized = Object.keys(cats).map(c => ({
    original: c,
    normalized: c.replace(/[-_]/g, '').toLowerCase()
  }));

  const groups: Record<string, string[]> = {};
  normalized.forEach(({ original, normalized }) => {
    if (!groups[normalized]) groups[normalized] = [];
    groups[normalized].push(original);
  });

  Object.entries(groups)
    .filter(([_, cats]) => cats.length > 1)
    .forEach(([base, cats]) => {
      console.log(`  ${base}: ${cats.join(', ')}`);
    });
}

check().catch(console.error);

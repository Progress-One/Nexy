import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('category, paired_with')
    .neq('category', 'onboarding')
    .eq('is_active', true);

  // Group by category and count paired/unpaired
  const stats: Record<string, { total: number; paired: number; unpaired: number }> = {};

  data?.forEach(s => {
    if (!stats[s.category]) {
      stats[s.category] = { total: 0, paired: 0, unpaired: 0 };
    }
    stats[s.category].total++;
    if (s.paired_with) {
      stats[s.category].paired++;
    } else {
      stats[s.category].unpaired++;
    }
  });

  console.log('Category             | Total | Paired | Unpaired');
  console.log('---------------------|-------|--------|----------');

  Object.keys(stats).sort().forEach(cat => {
    const s = stats[cat];
    console.log(`${cat.padEnd(20)} | ${String(s.total).padStart(5)} | ${String(s.paired).padStart(6)} | ${String(s.unpaired).padStart(8)}`);
  });

  const totals = Object.values(stats).reduce((acc, s) => ({
    total: acc.total + s.total,
    paired: acc.paired + s.paired,
    unpaired: acc.unpaired + s.unpaired
  }), { total: 0, paired: 0, unpaired: 0 });

  console.log('---------------------|-------|--------|----------');
  console.log(`${'TOTAL'.padEnd(20)} | ${String(totals.total).padStart(5)} | ${String(totals.paired).padStart(6)} | ${String(totals.unpaired).padStart(8)}`);
}

check().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function map() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, category, role_direction, paired_with, is_active, title, user_description')
    .order('category')
    .order('slug');

  // Group by category
  const byCategory: Record<string, typeof data> = {};
  data?.forEach(s => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  // Create paired lookup
  const pairedLookup: Record<string, string> = {};
  data?.forEach(s => {
    if (s.paired_with) {
      const paired = data.find(d => d.id === s.paired_with);
      if (paired) pairedLookup[s.slug] = paired.slug;
    }
  });

  let totalActive = 0;
  let totalInactive = 0;
  let totalPaired = 0;

  console.log('# Full Scene Map\n');
  console.log(`Generated: ${new Date().toISOString()}\n`);

  Object.entries(byCategory).sort().forEach(([category, scenes]) => {
    const active = scenes.filter(s => s.is_active !== false);
    const inactive = scenes.filter(s => s.is_active === false);
    const paired = scenes.filter(s => s.paired_with);

    totalActive += active.length;
    totalInactive += inactive.length;
    totalPaired += paired.length;

    console.log(`\n## ${category} (${active.length} active${inactive.length > 0 ? `, ${inactive.length} inactive` : ''})\n`);

    scenes.forEach(s => {
      const status = s.is_active === false ? ' [INACTIVE]' : '';
      const pair = s.paired_with ? ` ↔ ${pairedLookup[s.slug] || '?'}` : '';
      const role = s.role_direction ? ` (${s.role_direction})` : '';

      console.log(`- ${s.slug}${role}${status}${pair}`);
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n## Summary\n');
  console.log(`- **Total scenes:** ${data?.length}`);
  console.log(`- **Active:** ${totalActive}`);
  console.log(`- **Inactive:** ${totalInactive}`);
  console.log(`- **Paired:** ${totalPaired} (${totalPaired / 2} pairs)`);
  console.log(`- **Categories:** ${Object.keys(byCategory).length}`);
}

map().catch(console.error);

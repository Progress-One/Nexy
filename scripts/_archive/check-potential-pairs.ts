import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, role_direction, paired_with, user_description')
    .neq('category', 'onboarding')
    .eq('is_active', true)
    .is('paired_with', null)
    .order('category')
    .order('slug');

  // Group by base slug (remove -give/-receive/-m/-f suffixes)
  const groups: Record<string, Array<typeof data[0]>> = {};

  data?.forEach(s => {
    // Check if this is a directional scene (m_to_f, f_to_m, etc.)
    if (s.role_direction && ['m_to_f', 'f_to_m', 'f_on_m'].includes(s.role_direction)) {
      // Find potential pair
      const baseSlug = s.slug
        .replace(/-he-on-her$/, '')
        .replace(/-she-on-him$/, '')
        .replace(/-he-to-her$/, '')
        .replace(/-she-to-him$/, '')
        .replace(/-m-to-f$/, '')
        .replace(/-f-to-m$/, '')
        .replace(/-on-her$/, '')
        .replace(/-on-him$/, '')
        .replace(/-m$/, '')
        .replace(/-f$/, '');

      if (!groups[baseSlug]) groups[baseSlug] = [];
      groups[baseSlug].push(s);
    }
  });

  // Find groups with multiple scenes (potential pairs)
  console.log('Potential unpaired directional scenes:\n');

  Object.entries(groups)
    .filter(([_, scenes]) => scenes.length > 1)
    .forEach(([base, scenes]) => {
      console.log(`\n=== ${base} ===`);
      scenes.forEach(s => {
        console.log(`  ${s.slug}`);
        console.log(`    role: ${s.role_direction}`);
        console.log(`    RU: ${s.user_description?.ru?.substring(0, 60)}...`);
      });
    });

  // Also show single directional scenes
  console.log('\n\n--- Single directional scenes (no pair exists) ---\n');
  Object.entries(groups)
    .filter(([_, scenes]) => scenes.length === 1)
    .slice(0, 20)
    .forEach(([base, scenes]) => {
      const s = scenes[0];
      console.log(`${s.slug} (${s.role_direction})`);
    });
}

check().catch(console.error);

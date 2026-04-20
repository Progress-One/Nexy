import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get total active scenes
  const { count: totalActive } = await supabase.from('scenes').select('*', { count: 'exact', head: true }).eq('is_active', true);

  // Get total inactive
  const { count: totalInactive } = await supabase.from('scenes').select('*', { count: 'exact', head: true }).eq('is_active', false);

  // Get paired count (active only)
  const { count: pairedCount } = await supabase.from('scenes').select('*', { count: 'exact', head: true }).eq('is_active', true).not('paired_with', 'is', null);

  // Get by role_direction (active only)
  const { data: byRole } = await supabase.from('scenes').select('role_direction').eq('is_active', true);

  const roleCounts: Record<string, number> = {};
  for (const s of byRole || []) {
    roleCounts[s.role_direction] = (roleCounts[s.role_direction] || 0) + 1;
  }

  // Get by category (active only)
  const { data: byCat } = await supabase.from('scenes').select('category').eq('is_active', true);

  const catCounts: Record<string, number> = {};
  for (const s of byCat || []) {
    catCounts[s.category] = (catCounts[s.category] || 0) + 1;
  }

  console.log('=== СТАТИСТИКА ===');
  console.log('Активные сцены:', totalActive);
  console.log('Неактивные сцены:', totalInactive);
  console.log('С paired_with:', pairedCount);
  console.log('\nПо role_direction:');
  console.log(JSON.stringify(roleCounts, null, 2));
  console.log('\nПо категориям (топ-10):');
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [cat, count] of sortedCats) {
    console.log(`  ${cat}: ${count}`);
  }
}
run();

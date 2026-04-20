import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function exportScenesStatus() {
  console.log('Fetching scenes from database...');

  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('slug, title, category, is_active, onboarding_order')
    .not('slug', 'ilike', '%onboarding%')
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error fetching scenes:', error);
    return;
  }

  // Group by category
  const byCategory: Record<string, any[]> = {};
  let activeCount = 0;
  let inactiveCount = 0;

  for (const s of scenes || []) {
    const cat = s.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({
      slug: s.slug,
      title: (s.title as any)?.ru || s.slug,
      is_active: s.is_active ?? false,
    });

    if (s.is_active) activeCount++;
    else inactiveCount++;
  }

  // Summary
  const summary = {
    total: scenes?.length || 0,
    active: activeCount,
    inactive: inactiveCount,
    categories: Object.keys(byCategory).length,
  };

  const output = {
    exported_at: new Date().toISOString(),
    summary,
    scenes_by_category: byCategory,
  };

  // Write to file
  const outputPath = 'scenes/v2/scenes-status.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nExported to ${outputPath}`);
  console.log(`Total: ${summary.total} scenes`);
  console.log(`Active: ${summary.active}`);
  console.log(`Inactive: ${summary.inactive}`);
  console.log(`Categories: ${summary.categories}`);
}

exportScenesStatus();

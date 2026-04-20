import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const duplicatePairs = [
    ['impact_pain', 'impact-pain'],
    ['control_power', 'control-power'],
    ['worship_service', 'worship-service', 'worship'],
    ['cnc_rough', 'cnc-rough'],
  ];

  for (const cats of duplicatePairs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Checking: ${cats.join(' vs ')}`);
    console.log('='.repeat(60));

    const { data } = await supabase
      .from('scenes')
      .select('slug, category, is_active')
      .in('category', cats)
      .eq('is_active', true)
      .order('slug');

    // Group by base slug (remove -give/-receive suffix)
    const byBase: Record<string, Array<{ slug: string; category: string }>> = {};

    data?.forEach(s => {
      const base = s.slug
        .replace(/-give$/, '')
        .replace(/-receive$/, '');

      if (!byBase[base]) byBase[base] = [];
      byBase[base].push({ slug: s.slug, category: s.category });
    });

    // Find potential duplicates (same base slug in different categories)
    let duplicatesFound = false;
    Object.entries(byBase).forEach(([base, scenes]) => {
      const categories = [...new Set(scenes.map(s => s.category))];
      if (categories.length > 1) {
        duplicatesFound = true;
        console.log(`\n⚠️  DUPLICATE: ${base}`);
        scenes.forEach(s => console.log(`   ${s.slug} (${s.category})`));
      }
    });

    if (!duplicatesFound) {
      console.log('\n✓ No duplicate scenes, just different category names');
      console.log('\nScenes by category:');
      cats.forEach(cat => {
        const inCat = data?.filter(s => s.category === cat) || [];
        console.log(`\n  ${cat} (${inCat.length}):`);
        inCat.slice(0, 5).forEach(s => console.log(`    - ${s.slug}`));
        if (inCat.length > 5) console.log(`    ... and ${inCat.length - 5} more`);
      });
    }
  }
}

check().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function analyze() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, title, user_description, category, role_direction, is_active')
    .eq('is_active', true)
    .not('slug', 'ilike', '%onboarding%')
    .not('slug', 'ilike', '%-give')
    .not('slug', 'ilike', '%-receive')
    .order('category')
    .order('slug');

  // Group by category
  const byCategory: Record<string, typeof scenes> = {};
  for (const s of scenes || []) {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category]!.push(s);
  }

  for (const [category, categoryScenes] of Object.entries(byCategory)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`CATEGORY: ${category.toUpperCase()} (${categoryScenes!.length} scenes)`);
    console.log('='.repeat(60));

    for (const s of categoryScenes || []) {
      const title = (s.title as any)?.ru || '';
      const desc = ((s.user_description as any)?.ru || '').substring(0, 100);
      console.log(`\n${s.slug} (${s.role_direction})`);
      console.log(`  "${title}"`);
      console.log(`  ${desc}...`);
    }
  }

  console.log(`\n\nTotal categories: ${Object.keys(byCategory).length}`);
  console.log(`Total scenes: ${scenes?.length || 0}`);
}

analyze();

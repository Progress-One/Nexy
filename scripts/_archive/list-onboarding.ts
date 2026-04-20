import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function list() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, title, category, role_direction, image_url, image_variants')
    .ilike('slug', 'onboarding-%')
    .order('category')
    .order('slug');

  console.log('=== ONBOARDING SCENES ===\n');

  let lastCat = '';
  for (const s of data || []) {
    if (s.category !== lastCat) {
      console.log(`\n--- ${s.category} ---`);
      lastCat = s.category;
    }
    const variants = (s.image_variants as any[] || []).length;
    const hasImage = s.image_url ? '✓' : '✗';
    const title = (s.title as any)?.ru || (s.title as any)?.en || '';
    console.log(`  ${s.slug}`);
    console.log(`    ${s.role_direction} | img:${hasImage} | variants:${variants} | ${title.substring(0, 50)}`);
  }
}

list();

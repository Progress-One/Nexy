import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Get scenes related to impact-pain, rough, choking
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, category, image_url, image_variants, shared_images_with, paired_with')
    .or('category.eq.impact-pain,category.eq.rough,slug.ilike.%chok%,slug.ilike.%rough%,slug.ilike.%impact%');

  console.log('Impact-pain / Rough scenes:\n');

  // Sort by category
  const sorted = (scenes || []).sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  for (const s of sorted) {
    const variantCount = s.image_variants?.filter((v: any) => !v.is_placeholder)?.length || 0;
    const hasImage = s.image_url ? 'yes' : 'NO';
    const isPaired = s.paired_with ? 'paired' : '';
    const isShared = s.shared_images_with ? 'shared' : '';

    console.log(`${s.slug} [${s.category}]:`);
    console.log(`  image: ${hasImage}, variants: ${variantCount} ${isPaired} ${isShared}`);
  }
}

check();

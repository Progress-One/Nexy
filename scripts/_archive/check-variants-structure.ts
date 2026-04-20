import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get one of the problematic pairs with variants
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_url, variants')
    .ilike('slug', 'foot-worship%')
    .eq('is_active', true)
    .order('slug');

  for (const s of data || []) {
    console.log(`\n=== ${s.slug} ===`);
    const mainImg = s.image_url || '';
    console.log('Main image:', mainImg.substring(0, 80) + '...');

    const variants = s.variants as any[];
    if (variants && variants.length > 0) {
      console.log(`Variants (${variants.length}):`);
      for (const v of variants.slice(0, 3)) {
        const vImg = v.image_url || 'null';
        console.log(`  - id: ${v.id}, image: ${vImg.substring(0, 60)}...`);
      }
      if (variants.length > 3) {
        console.log(`  ... and ${variants.length - 3} more`);
      }
    } else {
      console.log('No variants');
    }
  }
}
run();

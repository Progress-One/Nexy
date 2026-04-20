import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const pattern = process.argv[2] || 'dirty-talk';

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants')
    .ilike('slug', `%${pattern}%`)
    .eq('is_active', true);

  console.log(`Scenes matching "${pattern}" with images:`);
  for (const s of data || []) {
    const variantCount = Array.isArray(s.image_variants) ? s.image_variants.length : 0;
    const hasImage = !!s.image_url;
    if (hasImage || variantCount > 0) {
      console.log('  ', s.slug);
      console.log('     image_url:', hasImage ? 'YES' : 'no');
      console.log('     variants:', variantCount);
    }
  }
}

run();

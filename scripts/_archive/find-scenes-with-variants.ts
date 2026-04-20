import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active, image_variants')
    .not('image_variants', 'is', null)
    .order('slug');

  console.log('Scenes with image_variants:');
  for (const s of data || []) {
    const count = s.image_variants?.length || 0;
    if (count > 0) {
      const status = s.is_active ? '[active]  ' : '[inactive]';
      console.log('  ' + status + ' ' + s.slug + ' (' + count + ' variants)');
    }
  }
}

run();

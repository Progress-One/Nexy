import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants')
    .not('image_variants', 'is', null)
    .gt('image_variants', '[]')
    .limit(5);

  data?.forEach(s => {
    const variants = s.image_variants || [];
    if (variants.length > 0) {
      console.log('\n=== ' + s.slug + ' ===');
      console.log('image_url:', s.image_url?.substring(0, 80) + '...');
      console.log('variants (' + variants.length + '):');
      variants.forEach((v: any, i: number) => {
        console.log('  ' + i + ': ' + v.url?.substring(0, 80) + '...');
      });
    }
  });
}

check().catch(console.error);

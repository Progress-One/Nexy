import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants')
    .ilike('slug', 'breath-play%')
    .eq('is_active', true);

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log('Found:', data?.length || 0, 'scenes\n');

  for (const s of data || []) {
    const variants = (s.image_variants as any[]) || [];
    console.log(s.slug);
    console.log('  image_url:', s.image_url ? 'SET' : 'NULL');
    console.log('  variants:', variants.length);
    if (variants.length > 0) {
      variants.forEach((v: any, i: number) => {
        console.log('    ' + i + ':', (v.url || '').substring(0, 50));
      });
    }
    console.log('');
  }
}
run().catch(console.error);

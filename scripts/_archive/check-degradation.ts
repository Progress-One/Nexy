import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, paired_with, image_variants')
    .ilike('slug', 'degradation%')
    .eq('is_active', true);

  for (const s of data || []) {
    const variants = (s.image_variants as any[]) || [];
    console.log('\n' + s.slug);
    console.log('  paired_with:', s.paired_with || 'NULL');
    console.log('  variants:', variants.length);
    variants.forEach((v: any, i: number) => {
      const url = v.url || '';
      console.log('    ' + i + ':', url.substring(0, 70));
    });
  }
}
run();

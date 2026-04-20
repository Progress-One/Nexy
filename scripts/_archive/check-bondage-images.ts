import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_variants')
    .ilike('slug', '%bondage%')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  data?.forEach(s => {
    const count = s.image_variants?.length || 0;
    console.log(s.slug + ': ' + count + ' images');
  });
}

check().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, user_description, image_url, paired_with, image_variants')
    .ilike('slug', '%lingerie%')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .order('slug');

  console.log('=== ONBOARDING LINGERIE SCENES ===\n');

  data?.forEach(s => {
    console.log(s.slug);
    console.log('  RU:', s.user_description?.ru?.substring(0, 70) || '(empty)');
    console.log('  img:', s.image_url ? 'YES' : 'no');
    console.log('  variants:', s.image_variants?.length || 0);
    console.log('  paired:', s.paired_with ? 'YES' : 'no');
    console.log('');
  });
}

check();

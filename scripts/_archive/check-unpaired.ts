import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, paired_with, user_description')
    .eq('category', 'onboarding')
    .eq('is_active', true)
    .is('paired_with', null)
    .order('slug');

  console.log('Scenes WITHOUT pairs (' + data?.length + '):\n');
  data?.forEach(s => {
    console.log(s.slug);
    console.log('  RU:', s.user_description?.ru || '-');
    console.log('');
  });
}

check().catch(console.error);

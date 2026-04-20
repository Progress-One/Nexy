import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, title, user_description, role_direction, is_active, paired_with')
    .ilike('slug', '%bondage%')
    .eq('category', 'onboarding')
    .order('slug');

  console.log('Bondage onboarding scenes:\n');
  data?.forEach(s => {
    console.log('slug:', s.slug);
    console.log('title:', s.title?.ru);
    console.log('role_direction:', s.role_direction);
    console.log('active:', s.is_active);
    console.log('paired_with:', s.paired_with ? 'yes' : 'no');
    console.log('user_description RU:', s.user_description?.ru);
    console.log('user_description EN:', s.user_description?.en);
    console.log('---');
  });
}

check().catch(console.error);

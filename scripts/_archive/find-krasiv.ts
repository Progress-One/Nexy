import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .eq('category', 'onboarding')
    .neq('is_active', false);

  console.log('=== SCENES WITH "красив" ===\n');

  data?.forEach(s => {
    const ru = s.user_description?.ru || '';
    if (ru.includes('красив')) {
      console.log(s.slug);
      console.log('  RU:', ru);
      console.log('');
    }
  });

  console.log('\n=== SCENES WITH "beautiful" ===\n');

  data?.forEach(s => {
    const en = s.user_description?.en || '';
    if (en.toLowerCase().includes('beautiful')) {
      console.log(s.slug);
      console.log('  EN:', en);
      console.log('');
    }
  });
}

check();

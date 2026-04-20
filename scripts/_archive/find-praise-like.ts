import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, user_description, category')
    .eq('category', 'onboarding')
    .neq('is_active', false);

  const keywords = ['красив', 'молодец', 'хорош', 'good girl', 'beautiful', 'похвал', 'praise', 'комплимент'];

  console.log('=== SCENES WITH PRAISE-LIKE DESCRIPTIONS ===\n');

  data?.forEach(s => {
    const ru = s.user_description?.ru?.toLowerCase() || '';
    const en = s.user_description?.en?.toLowerCase() || '';

    for (const kw of keywords) {
      if (ru.includes(kw) || en.includes(kw)) {
        console.log(s.slug);
        console.log('  RU:', s.user_description?.ru?.substring(0, 100));
        console.log('  EN:', s.user_description?.en?.substring(0, 100));
        console.log('');
        break;
      }
    }
  });
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, user_description, name')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .order('slug');

  // Ищем комплименты про внешность
  const keywords = ['красив', 'красот', 'gorgeous', 'beautiful', 'handsome', 'pretty', 'sexy', 'горяч', 'сексуальн'];

  console.log('=== SCENES WITH APPEARANCE COMPLIMENTS ===\n');

  data?.forEach(s => {
    const ru = s.user_description?.ru?.toLowerCase() || '';
    const en = s.user_description?.en?.toLowerCase() || '';

    for (const kw of keywords) {
      if (ru.includes(kw) || en.includes(kw)) {
        console.log(s.slug);
        console.log('  Name:', s.name?.ru || s.name?.en);
        console.log('  RU:', s.user_description?.ru);
        console.log('  EN:', s.user_description?.en);
        console.log('');
        break;
      }
    }
  });
}

check();

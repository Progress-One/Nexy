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

  console.log('=== ALL ONBOARDING DESCRIPTIONS ===\n');

  // Показать все praise, dirty-talk, romantic сцены
  const relevant = ['praise', 'dirty', 'romantic'];

  data?.forEach(s => {
    const isRelevant = relevant.some(r => s.slug.includes(r));
    if (isRelevant) {
      console.log(s.slug);
      console.log('  RU:', s.user_description?.ru);
      console.log('');
    }
  });

  // Также поищем "такая" или "такой" в описаниях (как в praise)
  console.log('\n=== SCENES WITH "ТАКАЯ/ТАКОЙ" ===\n');
  data?.forEach(s => {
    const ru = s.user_description?.ru || '';
    if (ru.includes('Такая') || ru.includes('Такой') || ru.includes('такая') || ru.includes('такой')) {
      console.log(s.slug);
      console.log('  RU:', ru);
      console.log('');
    }
  });
}

check();

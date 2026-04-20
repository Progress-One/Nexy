import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, title, user_description, ai_description, generation_prompt')
    .in('slug', ['onboarding-quickie-hetero-m', 'onboarding-quickie-hetero-f']);

  data?.forEach(s => {
    console.log('=== ' + s.slug + ' ===');
    console.log('Title RU:', s.title?.ru);
    console.log('Title EN:', s.title?.en);
    console.log('');
    console.log('user_description RU:', s.user_description?.ru);
    console.log('user_description EN:', s.user_description?.en);
    console.log('');
    console.log('ai_description RU:', s.ai_description?.ru);
    console.log('ai_description EN:', s.ai_description?.en);
    console.log('');
    console.log('generation_prompt:', s.generation_prompt);
    console.log('\n');
  });
}

check().catch(console.error);

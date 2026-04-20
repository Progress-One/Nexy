import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, title, user_description, generation_prompt, is_active')
    .or('generation_prompt.ilike.%kitchen counter%,user_description->>ru.ilike.%кухонный стол%');

  console.log('Found', data?.length || 0, 'scenes:\n');
  data?.forEach(s => {
    console.log('slug:', s.slug);
    console.log('title:', s.title?.ru);
    console.log('active:', s.is_active);
    console.log('user_description RU:', s.user_description?.ru);
    console.log('generation_prompt:', s.generation_prompt);
    console.log('---');
  });
}

check().catch(console.error);

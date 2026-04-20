import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, generation_prompt, user_description, image_url')
    .eq('category', 'onboarding')
    .ilike('slug', '%lingerie%alt%');

  console.log('=== LINGERIE ALT SCENES ===\n');
  data?.forEach(s => {
    console.log('SLUG:', s.slug);
    console.log('PROMPT:', s.generation_prompt?.substring(0, 100));
    console.log('RU:', s.user_description?.ru);
    console.log('IMAGE:', s.image_url ? 'YES' : 'NO');
    console.log('---');
  });
}

check();

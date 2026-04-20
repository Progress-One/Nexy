import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, generation_prompt, user_description, category')
    .ilike('generation_prompt', '%choking%');

  console.log(`=== SCENES WITH "choking" IN PROMPT (${data?.length || 0}) ===\n`);

  data?.forEach(s => {
    const isExtreme = s.slug.includes('extreme') || s.slug.includes('breath');
    const status = isExtreme ? '✓ OK' : '✗ WRONG';

    console.log(`${status} | ${s.slug}`);
    console.log('  Category:', s.category);
    console.log('  Prompt:', s.generation_prompt?.substring(0, 80) + '...');
    console.log('  Desc RU:', s.user_description?.ru?.substring(0, 60));
    console.log('');
  });
}

check();

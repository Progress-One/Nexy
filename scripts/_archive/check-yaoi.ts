import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, is_active, role_direction, category')
    .ilike('generation_prompt', '%yaoi%');

  console.log('Scenes with yaoi in prompt:', data?.length || 0);
  data?.forEach(s => {
    console.log(`  ${s.slug} | active: ${s.is_active} | role: ${s.role_direction} | cat: ${s.category}`);
  });
}

check().catch(console.error);

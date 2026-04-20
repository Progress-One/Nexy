import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('category')
    .neq('is_active', false);

  const categories = new Set(data?.map(s => s.category));
  console.log('Categories:', [...categories]);

  // Get worship scenes
  const { data: worship } = await supabase
    .from('scenes')
    .select('slug, name, user_description, category')
    .ilike('category', '%worship%');

  console.log('\nWorship scenes:', worship?.length);
  worship?.forEach(s => {
    console.log('  -', s.slug, '|', s.category);
  });
}

check();

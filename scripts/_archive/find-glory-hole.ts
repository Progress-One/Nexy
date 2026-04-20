import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function find() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, title, is_active')
    .ilike('slug', '%glory%');

  console.log('Glory hole scenes:');
  for (const s of data || []) {
    const title = (s.title as any)?.ru || '';
    console.log(`${s.slug} | active=${s.is_active} | ${title}`);
  }
}

find();

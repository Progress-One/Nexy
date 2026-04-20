import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const pattern = process.argv[2] || '';

async function run() {
  const query = supabase
    .from('scenes')
    .select('id, slug, is_active, for_gender')
    .order('slug');
  
  if (pattern) {
    query.ilike('slug', '%' + pattern + '%');
  }

  const { data } = await query;

  console.log('Scenes matching "' + pattern + '":');
  for (const s of data || []) {
    const status = s.is_active ? '[active]' : '[inactive]';
    const gender = s.for_gender || 'null';
    console.log('  ' + status + ' ' + s.slug + ' (' + gender + ') id=' + s.id);
  }
  console.log('\nTotal: ' + (data?.length || 0));
}

run();

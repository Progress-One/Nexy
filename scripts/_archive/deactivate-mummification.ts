import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', '%mummif%');

  console.log('Found:', data?.map(s => s.slug + ' | active: ' + s.is_active));

  if (data && data.length > 0) {
    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .ilike('slug', '%mummif%');

    if (error) console.log('Error:', error);
    else console.log('Deactivated', data.length, 'mummification scenes');
  }
}
run();

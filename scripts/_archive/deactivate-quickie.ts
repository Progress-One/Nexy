import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'quickie');

  if (error) console.log('Error:', error);
  else console.log('Deactivated: quickie');
}
run();

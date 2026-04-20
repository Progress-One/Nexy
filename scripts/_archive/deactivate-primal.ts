import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', 'primal')
    .select('slug, is_active');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Deactivated:', data);
  }
}

run();

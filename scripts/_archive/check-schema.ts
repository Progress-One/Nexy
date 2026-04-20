import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('*')
    .limit(1);

  if (data && data[0]) {
    console.log('Scene fields:');
    console.log(Object.keys(data[0]).sort().join('\n'));
  }
}

check();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase.from('scenes').select('role_direction').limit(100);
  const unique = [...new Set(data?.map(s => s.role_direction))];
  console.log('role_direction values:', unique);
}
run();

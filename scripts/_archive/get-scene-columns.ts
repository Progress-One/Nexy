import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('*')
    .eq('slug', 'emotional-sex')
    .single();

  console.log('Scene columns:');
  for (const [key, value] of Object.entries(data || {})) {
    const preview = typeof value === 'string' ? value.substring(0, 60) : JSON.stringify(value)?.substring(0, 60);
    console.log('  ' + key + ':', preview);
  }
}

run();

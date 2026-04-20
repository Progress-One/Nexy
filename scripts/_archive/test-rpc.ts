import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Try calling the function with a fake UUID
  const { data, error } = await supabase.rpc('get_excluded_scene_ids', {
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });

  console.log('Result:', data);
  console.log('Error:', JSON.stringify(error, null, 2));

  // Also try with anon key
  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: data2, error: error2 } = await anonSupabase.rpc('get_excluded_scene_ids', {
    p_user_id: '00000000-0000-0000-0000-000000000000'
  });

  console.log('\nWith anon key:');
  console.log('Result:', data2);
  console.log('Error:', JSON.stringify(error2, null, 2));
}
run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Fix butt-plug-he-wears-receive
  const { error: e1 } = await supabase
    .from('scenes')
    .update({ role_direction: 'f_to_m' })
    .eq('slug', 'butt-plug-he-wears-receive');
  console.log(e1 ? 'Error: ' + e1.message : '✓ butt-plug-he-wears-receive → f_to_m');

  // Fix butt-plug-she-wears-give
  const { error: e2 } = await supabase
    .from('scenes')
    .update({ role_direction: 'f_to_m' })
    .eq('slug', 'butt-plug-she-wears-give');
  console.log(e2 ? 'Error: ' + e2.message : '✓ butt-plug-she-wears-give → f_to_m');
}
run();

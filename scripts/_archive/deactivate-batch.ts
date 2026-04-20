import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Find scenes: angry-sex, vibrator, taboo-roleplay
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .or('slug.ilike.%angry-sex%,slug.ilike.%vibrator%,slug.ilike.%taboo%')
    .eq('is_active', true);

  console.log('Found active:', data?.map(s => s.slug));

  if (data && data.length > 0) {
    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('slug', data.map(s => s.slug));

    if (error) console.log('Error:', error);
    else console.log('Deactivated', data.length, 'scenes');
  }
}
run();

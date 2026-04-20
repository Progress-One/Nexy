import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Search for ruined orgasm scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, is_active')
    .or('slug.ilike.%ruined%,slug.ilike.%orgasm%')
    .eq('is_active', true);

  console.log('Found:', scenes?.map(s => s.slug));

  if (scenes && scenes.length > 0) {
    const ids = scenes.map(s => s.id);
    const { error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('id', ids);

    if (error) console.log('Error:', error);
    else console.log('Deactivated', scenes.length, 'scenes');
  }
}
run();

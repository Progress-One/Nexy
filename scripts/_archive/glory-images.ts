import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, is_active')
    .ilike('slug', '%glory%')
    .order('slug');

  console.log('Glory hole scenes:');
  for (const s of scenes || []) {
    const { count } = await supabase
      .from('scene_images')
      .select('*', { count: 'exact', head: true })
      .eq('scene_id', s.id);
    
    const status = s.is_active ? '[active]  ' : '[inactive]';
    console.log('  ' + status + ' ' + s.slug + ' (id: ' + s.id + ', images: ' + count + ')');
  }
}

run();

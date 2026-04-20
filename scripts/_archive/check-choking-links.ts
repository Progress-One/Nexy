import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .ilike('slug', '%chok%');

  for (const s of data || []) {
    if (s.shared_images_with) {
      const { data: source } = await supabase
        .from('scenes')
        .select('slug, image_variants')
        .eq('id', s.shared_images_with)
        .single();
      const v = source?.image_variants?.filter((x: any) => !x.is_placeholder)?.length || 0;
      console.log(`${s.slug} -> ${source?.slug} (${v} variants)`);
    } else {
      console.log(`${s.slug} -> NOT SHARED`);
    }
  }
}

check();

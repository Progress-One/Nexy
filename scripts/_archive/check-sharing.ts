import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const pattern = process.argv[2] || 'harness';

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .select('slug, shared_images_with')
    .ilike('slug', `%${pattern}%`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Scenes matching "${pattern}":`);
  for (const s of data || []) {
    if (s.shared_images_with) {
      // Look up the shared scene
      const { data: linked } = await supabase
        .from('scenes')
        .select('slug')
        .eq('id', s.shared_images_with)
        .single();
      console.log('  ', s.slug, '-> shared from:', linked?.slug);
    } else {
      console.log('  ', s.slug, '-> no sharing');
    }
  }
}

run();

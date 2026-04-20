import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Search by category or description
  const { data } = await supabase
    .from('scenes')
    .select('slug, paired_with, shared_images_with, role_direction, category')
    .eq('category', 'emotional-context')
    .eq('is_active', true);

  console.log('Found:', data?.length, 'scenes in emotional-context\n');
  for (const s of data || []) {
    console.log(s.slug);
    console.log('  role_direction:', s.role_direction);
    console.log('  paired_with:', s.paired_with || 'null');
    console.log('  shared_images_with:', s.shared_images_with || 'null');
    console.log('');
  }
}
run();

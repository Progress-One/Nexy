import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .update({ shared_images_with: null })
    .in('slug', ['male-lingerie-give', 'male-lingerie-receive'])
    .select('slug, shared_images_with');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Cleared shared_images_with for:');
    for (const s of data || []) {
      console.log('  ', s.slug, '-> now:', s.shared_images_with);
    }
  }
}

run();

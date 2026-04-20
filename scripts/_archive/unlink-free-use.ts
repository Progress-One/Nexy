import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .update({ shared_images_with: null })
    .in('slug', ['free-use-f-available', 'free-use-m-available'])
    .select('slug, shared_images_with');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✅ Removed shared_images_with from free-use scenes');
    console.log(data);
  }
}

run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function unlinkAll() {
  const slugsToUnlink = [
    'collar-she-owns-him',
    'collar-she-owns-him-give',
    'collar-she-owns-him-receive',
    'male-lingerie',
    'male-lingerie-give',
    'male-lingerie-receive',
  ];

  console.log('Unlinking:', slugsToUnlink);

  const { data, error } = await supabase
    .from('scenes')
    .update({ shared_images_with: null })
    .in('slug', slugsToUnlink)
    .select('slug, shared_images_with');

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Result:');
    for (const s of data || []) {
      console.log(`  ${s.slug}: shared_images_with = ${s.shared_images_with || 'null'}`);
    }
  }
}

unlinkAll();

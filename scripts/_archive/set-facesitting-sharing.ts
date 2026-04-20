import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get source scene ID (facesitting-he-on-her)
  const { data: sourceScene } = await supabase
    .from('scenes')
    .select('id, slug')
    .eq('slug', 'facesitting-he-on-her')
    .single();

  if (!sourceScene) {
    console.error('Source scene not found');
    return;
  }

  console.log('Source:', sourceScene.slug, '->', sourceScene.id);

  // Set shared_images_with for facesitting-she-on-him
  const { data, error } = await supabase
    .from('scenes')
    .update({ shared_images_with: sourceScene.id })
    .eq('slug', 'facesitting-she-on-him')
    .select('slug, shared_images_with');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Updated:');
    for (const s of data || []) {
      console.log('  ', s.slug, '-> shared_images_with:', s.shared_images_with);
    }
  }
}

run();

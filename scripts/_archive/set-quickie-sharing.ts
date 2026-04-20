import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get source scene ID (onboarding-quickie)
  const { data: sourceScene } = await supabase
    .from('scenes')
    .select('id, slug')
    .eq('slug', 'onboarding-quickie')
    .single();

  if (!sourceScene) {
    console.error('Source scene not found');
    return;
  }

  console.log('Source:', sourceScene.slug, '->', sourceScene.id);

  // Set shared_images_with for quickie
  const { data, error } = await supabase
    .from('scenes')
    .update({ shared_images_with: sourceScene.id })
    .eq('slug', 'quickie')
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

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const slugToDelete = process.argv[2];

async function run() {
  if (!slugToDelete) {
    console.log('Usage: npx tsx scripts/delete-scene.ts <slug>');
    return;
  }

  console.log('Deleting scene:', slugToDelete);

  const { data, error } = await supabase
    .from('scenes')
    .delete()
    .eq('slug', slugToDelete)
    .select();

  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Deleted:', data[0].slug);
  } else {
    console.log('Scene not found or already deleted');
  }
}

run();

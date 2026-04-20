import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const slug = process.argv[2];

if (!slug) {
  console.log('Usage: npx tsx scripts/deactivate-scene.ts <slug>');
  process.exit(1);
}

async function run() {
  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .eq('slug', slug)
    .select('slug, is_active');

  if (error) {
    console.log('Error:', error.message);
  } else if (data?.length === 0) {
    console.log(`Scene "${slug}" not found`);
  } else {
    console.log(`✅ Deactivated: ${slug}`);
  }
}

run();

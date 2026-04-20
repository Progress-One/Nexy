import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Check facesitting and rimming scenes
  const { data } = await supabase
    .from('scenes')
    .select('slug, title, is_active')
    .or('slug.ilike.%facesitting%,slug.ilike.%rimming%')
    .order('slug');

  console.log('Facesitting/Rimming scenes in DB:');
  for (const s of data || []) {
    const title = (s.title as any)?.ru || '';
    console.log(`  ${s.is_active ? '✅' : '❌'} ${s.slug} - ${title}`);
  }
}

run();

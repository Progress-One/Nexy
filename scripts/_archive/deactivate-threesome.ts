import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('Деактивация threesome-fmf и threesome-mfm...\n');

  const { error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('slug', ['threesome-fmf', 'threesome-mfm']);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('✓ Деактивированы: threesome-fmf, threesome-mfm');
  }

  // Verify
  const { data } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', 'threesome%');

  console.log('\nСтатус threesome сцен:');
  for (const s of data || []) {
    console.log(s.is_active ? '  [active]' : '  [inactive]', s.slug);
  }
}

run();

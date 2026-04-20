import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Reactivate forced-orgasm and orgasm-control scenes (they were deactivated by mistake)
  const toReactivate = [
    'forced-orgasm-on-her-give',
    'forced-orgasm-on-him-give',
    'forced-orgasm-on-him-receive',
    'forced-orgasm-on-her-receive',
    'orgasm-control-f-to-m',
    'orgasm-control-m-to-f'
  ];

  const { error } = await supabase
    .from('scenes')
    .update({ is_active: true })
    .in('slug', toReactivate);

  if (error) console.log('Error:', error);
  else console.log('Reactivated', toReactivate.length, 'scenes');

  // Confirm ruined-orgasm scenes are still inactive
  const { data: ruined } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', '%ruined%');

  console.log('\nRuined orgasm scenes (should be inactive):');
  for (const s of ruined || []) {
    console.log(' -', s.slug, '| active:', s.is_active);
  }
}
run();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Find scenes that have follow_up set
  const { data } = await supabase
    .from('scenes')
    .select('slug, follow_up')
    .not('follow_up', 'is', null)
    .limit(20);

  console.log('Scenes with follow_up set:\n');
  for (const s of data || []) {
    console.log(`${s.slug}: follow_up = ${s.follow_up}`);
  }

  // Also check spanking and whipping
  console.log('\n\nSpanking & Whipping scenes:');
  const { data: sw } = await supabase
    .from('scenes')
    .select('slug, follow_up')
    .or('slug.ilike.%spank%,slug.ilike.%whip%');

  for (const s of sw || []) {
    console.log(`${s.slug}: follow_up = ${s.follow_up || 'null'}`);
  }
}

check();

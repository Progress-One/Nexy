import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Check what scenes these UUIDs point to
  const uuids = [
    '5ac734dc-2605-41ee-a384-b12e2c3e7044',
    '9dbde77b-bbde-4ff3-8d69-2333bf4e7581'
  ];

  const { data } = await supabase
    .from('scenes')
    .select('id, slug')
    .in('id', uuids);

  console.log('UUID mappings:');
  for (const s of data || []) {
    console.log(`  ${s.id} → ${s.slug}`);
  }

  // Also check reverse - what points to free-use scenes
  const { data: freeUse } = await supabase
    .from('scenes')
    .select('id, slug')
    .ilike('slug', '%free-use-f-available%');

  console.log('\nFree-use-f scenes:');
  for (const s of freeUse || []) {
    console.log(`  ${s.slug}: ${s.id}`);
  }
}

run();

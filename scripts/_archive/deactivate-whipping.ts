import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function deactivate() {
  // Find all whipping scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, is_active')
    .ilike('slug', '%whipping%');

  console.log('Whipping scenes found:');
  for (const s of scenes || []) {
    console.log(`  ${s.slug}: is_active=${s.is_active}`);
  }

  if (!scenes || scenes.length === 0) {
    console.log('No whipping scenes found');
    return;
  }

  // Deactivate all whipping scenes
  const ids = scenes.map(s => s.id);
  const { error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('id', ids);

  if (error) {
    console.log('Error deactivating:', error.message);
  } else {
    console.log(`\nDeactivated ${ids.length} whipping scenes`);
    console.log('Reason: whipping is now covered as follow_up option inside spanking scene');
  }
}

deactivate();

/**
 * Fix: Set is_active = false for mlm/wlw scenes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Setting is_active = false for mlm/wlw scenes...\n');

  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: false })
    .in('role_direction', ['mlm', 'wlw'])
    .select('slug, role_direction');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log(`Fixed ${data?.length || 0} scenes:\n`);
  data?.forEach(s => console.log(`  - ${s.slug} (${s.role_direction})`));
}

main().catch(console.error);

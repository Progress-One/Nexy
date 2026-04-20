import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .ilike('slug', '%praise%')
    .eq('category', 'onboarding')
    .neq('is_active', false);

  console.log('Raw data:');
  console.log(JSON.stringify(data, null, 2));
}

check();

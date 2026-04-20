import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, role_direction, category')
    .eq('category', 'onboarding')
    .eq('is_active', true);

  data?.forEach(s => console.log(s.slug, '|', s.role_direction));
}

check().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, role_direction, paired_with')
    .ilike('slug', '%bondage%')
    .eq('category', 'onboarding')
    .eq('is_active', true)
    .order('slug');

  console.log('Active bondage onboarding scenes:\n');
  data?.forEach(s => {
    const pairedScene = data.find(d => d.id === s.paired_with);
    console.log(s.slug);
    console.log('  role:', s.role_direction);
    console.log('  paired with:', pairedScene?.slug || 'none');
    console.log('');
  });
}

check().catch(console.error);

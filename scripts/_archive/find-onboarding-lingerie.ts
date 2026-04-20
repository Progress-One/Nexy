import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function find() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, role_direction, is_active, paired_with, title, user_description')
    .eq('category', 'onboarding')
    .ilike('slug', '%lingerie%')
    .order('slug');

  console.log('Onboarding lingerie scenes:\n');
  data?.forEach(s => {
    const status = s.is_active === false ? '[INACTIVE]' : '[ACTIVE]';
    const paired = s.paired_with ? '(paired)' : '';
    console.log(`${s.slug} ${status} ${paired}`);
    console.log(`  role_direction: ${s.role_direction}`);
    console.log(`  title: ${JSON.stringify(s.title)}`);
    console.log(`  user_description: ${JSON.stringify(s.user_description)}`);
    console.log('');
  });
}
find();

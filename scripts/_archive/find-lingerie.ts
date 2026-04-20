import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function find() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, role_direction, is_active, paired_with, title')
    .ilike('slug', '%lingerie%')
    .order('category')
    .order('slug');

  console.log('All lingerie scenes:\n');
  data?.forEach(s => {
    const status = s.is_active === false ? ' [INACTIVE]' : '';
    const paired = s.paired_with ? ' (paired)' : '';
    console.log(`- ${s.slug} | ${s.category} | ${s.role_direction}${status}${paired}`);
    console.log(`  Title: ${JSON.stringify(s.title)}`);
  });
  console.log(`\nTotal: ${data?.length}`);
}
find();

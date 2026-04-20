import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, category, role_direction, paired_with, user_description, is_active')
    .or('slug.ilike.%foot%,category.eq.worship,category.eq.worship_service,category.eq.worship-service')
    .order('category')
    .order('slug');

  console.log('Foot/Worship scenes:\n');

  let cat = '';
  data?.forEach(s => {
    if (s.category !== cat) {
      cat = s.category;
      console.log('\n=== ' + cat + ' ===');
    }
    const paired = s.paired_with ? '✓ paired' : '- unpaired';
    const active = s.is_active !== false ? '' : ' [INACTIVE]';
    console.log(`${s.slug}${active}`);
    console.log(`  role: ${s.role_direction}, ${paired}`);
    console.log(`  RU: ${s.user_description?.ru || '-'}`);
    console.log('');
  });
}

check().catch(console.error);

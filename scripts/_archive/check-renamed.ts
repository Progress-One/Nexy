import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const topics = ['extreme', 'romantic', 'toys', 'lingerie'];

  for (const topic of topics) {
    const { data } = await supabase
      .from('scenes')
      .select('slug')
      .eq('category', 'onboarding')
      .ilike('slug', `%${topic}%`)
      .neq('is_active', false)
      .order('slug');

    console.log(`\n${topic.toUpperCase()}:`);
    data?.forEach(s => {
      const hasGive = s.slug.includes('-give');
      const hasReceive = s.slug.includes('-receive');
      const marker = hasGive ? ' [GIVE]' : hasReceive ? ' [RECEIVE]' : ' [NO PATTERN!]';
      console.log(`  ${s.slug}${marker}`);
    });
  }
}

check();

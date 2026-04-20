import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const topics = ['extreme', 'romantic', 'toys', 'lingerie'];

  for (const topic of topics) {
    const { data } = await supabase
      .from('scenes')
      .select('id, slug, paired_with, user_description')
      .eq('category', 'onboarding')
      .ilike('slug', `%${topic}%`)
      .neq('is_active', false)
      .order('slug');

    console.log(`\n=== ${topic.toUpperCase()} ===`);

    const byId: Record<string, any> = {};
    data?.forEach(s => byId[s.id] = s);

    data?.forEach(s => {
      const paired = s.paired_with ? byId[s.paired_with] : null;
      const pairedSlug = paired?.slug || 'NOT FOUND';
      const desc = s.user_description?.ru?.substring(0, 40) || '';

      console.log(`${s.slug}`);
      console.log(`  "${desc}..."`);
      console.log(`  paired → ${pairedSlug}`);
    });
  }
}

check();

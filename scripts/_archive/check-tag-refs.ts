import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, elements')
    .ilike('slug', 'foot-worship%')
    .eq('is_active', true)
    .order('slug');

  console.log('=== TAG REFS ===\n');
  for (const s of data || []) {
    console.log(s.slug + ':');
    const elements = (s.elements as any[]) || [];
    for (const el of elements) {
      console.log('  - tag_ref:', el.tag_ref);
      const hasRoleFollowUp = el.follow_ups?.some((f: any) => f.type === 'role');
      console.log('    has role follow-up:', hasRoleFollowUp || false);
    }
    console.log('');
  }
}
run();

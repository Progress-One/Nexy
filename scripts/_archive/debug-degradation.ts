import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with')
    .ilike('slug', 'degradation-he-degrades-her%')
    .eq('is_active', true);

  console.log('=== degradation-he-degrades-her pair ===\n');

  for (const s of data || []) {
    console.log(`${s.slug}:`);
    console.log(`  id: ${s.id}`);
    console.log(`  paired_with: ${s.paired_with}`);

    // Check what paired_with points to
    if (s.paired_with) {
      const { data: paired } = await supabase
        .from('scenes')
        .select('slug')
        .eq('id', s.paired_with)
        .single();
      console.log(`  paired_with points to: ${paired?.slug || 'NOT FOUND'}`);
    }
    console.log('');
  }
}

run();

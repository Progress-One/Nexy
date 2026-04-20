import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, generation_prompt')
    .or('image_url.is.null,image_url.eq.')
    .not('generation_prompt', 'is', null)
    .limit(15);

  console.log(`Sample prompts for ${scenes?.length || 0} scenes without images:\n`);
  scenes?.forEach(s => {
    console.log(`${s.slug}:`);
    console.log(`  "${(s.generation_prompt || 'NULL').substring(0, 100)}..."`);
    console.log();
  });
}

check();

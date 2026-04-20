import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const RENAMES: Record<string, string> = {
  'glory-hole-f-gives': 'glory-hole-blowjob',
  'glory-hole-f-gives-give': 'glory-hole-blowjob-give',
  'glory-hole-f-gives-receive': 'glory-hole-blowjob-receive',
  'glory-hole-m-gives': 'glory-hole-cunnilingus',
  'glory-hole-m-gives-give': 'glory-hole-cunnilingus-give',
  'glory-hole-m-gives-receive': 'glory-hole-cunnilingus-receive',
};

async function run() {
  for (const [oldSlug, newSlug] of Object.entries(RENAMES)) {
    const { data, error } = await supabase
      .from('scenes')
      .update({ slug: newSlug })
      .eq('slug', oldSlug)
      .select('slug');

    if (error) {
      console.log(`❌ ${oldSlug}: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`✅ ${oldSlug} → ${newSlug}`);
    } else {
      console.log(`⚠️  ${oldSlug}: not found`);
    }
  }
}

run();

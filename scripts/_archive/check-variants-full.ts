import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_variants')
    .eq('slug', 'onboarding-anal-give-hetero-m')
    .single();

  console.log('Scene:', data?.slug);
  console.log('\nVariants:');
  (data?.image_variants || []).forEach((v: any, i: number) => {
    console.log(`\n[${i}] URL: ${v.url}`);
    console.log(`    Prompt: ${v.prompt?.substring(0, 50)}...`);
  });
}

check().catch(console.error);

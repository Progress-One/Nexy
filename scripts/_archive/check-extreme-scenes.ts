import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with, image_url, image_variants, generation_prompt')
    .ilike('slug', '%extreme%hetero%')
    .eq('category', 'onboarding');

  const byId: Record<string, typeof data![0]> = {};
  data?.forEach(s => byId[s.id] = s);

  for (const s of data || []) {
    const paired = s.paired_with ? byId[s.paired_with] : null;
    console.log(`${s.slug}:`);
    console.log(`  id: ${s.id}`);
    console.log(`  paired_with: ${paired?.slug || 'none'}`);
    console.log(`  has_image: ${!!s.image_url}`);
    console.log(`  variants: ${(s.image_variants || []).length}`);
    console.log(`  prompt: ${(s.generation_prompt || 'EMPTY').substring(0, 60)}...`);
    console.log();
  }
}

check();

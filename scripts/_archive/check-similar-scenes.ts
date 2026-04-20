import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // f_to_m - она контролирует его
  const r1 = await supabase.from('scenes').update({
    generation_prompt: 'woman on top holding man down on bed, teasing him, edging, intimate bedroom, soft lighting'
  }).eq('slug', 'orgasm-control-f-to-m').select('slug');
  console.log('Updated:', r1.data?.[0]?.slug);

  // m_to_f - он контролирует её
  const r2 = await supabase.from('scenes').update({
    generation_prompt: 'man hovering over woman on bed, teasing her, edging, intimate bedroom, soft lighting'
  }).eq('slug', 'orgasm-control-m-to-f').select('slug');
  console.log('Updated:', r2.data?.[0]?.slug);
}

run();

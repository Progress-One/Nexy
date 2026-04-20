import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, generation_prompt, image_url')
    .in('slug', [
      'onboarding-body-fluids-give-lesbian',
      'onboarding-body-fluids-give-gay',
      'onboarding-body-fluids-receive-lesbian',
      'onboarding-foot-receive-gay'
    ]);

  console.log('4 scenes with remaining complex prompts:\n');
  data?.forEach(s => {
    console.log(`${s.slug}:`);
    console.log(`  has image_url: ${!!s.image_url}`);
    console.log(`  prompt: ${(s.generation_prompt || 'NULL').substring(0, 80)}...`);
    console.log();
  });
}

check();

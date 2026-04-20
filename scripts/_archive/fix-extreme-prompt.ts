import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  // F→M pair: woman chokes man
  const promptFtoM = "woman's hands on man's throat, choking him, breath play, intense expression, bedroom, dominant woman, submissive man";

  const slugs = [
    'onboarding-extreme-give-hetero-f',
    'onboarding-extreme-receive-hetero-m'
  ];

  for (const slug of slugs) {
    console.log(`Fixing: ${slug}`);

    const { error } = await supabase
      .from('scenes')
      .update({ generation_prompt: promptFtoM })
      .eq('slug', slug);

    if (error) {
      console.log(`  ERROR: ${error.message}`);
    } else {
      console.log(`  OK - set to F→M prompt`);
    }
  }

  console.log('\n=== DONE ===');
}

fix();

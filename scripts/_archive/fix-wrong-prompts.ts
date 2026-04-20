import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const fixes: Record<string, string> = {
  // Мужская сбруя/harness
  'onboarding-lingerie-give-hetero-m-alt':
    'man in leather harness with straps, muscular body, bedroom, intimate lighting, woman admiring him, sensual atmosphere',
  'onboarding-lingerie-receive-hetero-f-alt':
    'man in leather harness with straps, muscular body, bedroom, intimate lighting, woman admiring him, sensual atmosphere',

  // Романтика - свечи, медленное раздевание
  'onboarding-romantic-give-hetero-f':
    'romantic bedroom with candles, soft lighting, woman slowly undressing man, kissing his body, intimate tender moment',
  'onboarding-romantic-receive-hetero-m':
    'romantic bedroom with candles, soft lighting, woman slowly undressing man, kissing his body, intimate tender moment',

  // Секс игрушки - вибратор, использование на партнёре
  'onboarding-toys-give-hetero-f':
    'woman using vibrator on man, bedroom, intimate, sex toy play, pleasuring partner with toy',
  'onboarding-toys-receive-hetero-m':
    'woman using vibrator on man, bedroom, intimate, sex toy play, pleasuring partner with toy',
};

async function fix() {
  for (const [slug, prompt] of Object.entries(fixes)) {
    console.log(`Fixing: ${slug}`);
    console.log(`  New prompt: ${prompt.substring(0, 60)}...`);

    const { error } = await supabase
      .from('scenes')
      .update({ generation_prompt: prompt })
      .eq('slug', slug);

    if (error) {
      console.log(`  ERROR: ${error.message}`);
    } else {
      console.log(`  OK`);
    }
  }

  console.log('\n=== DONE ===');
}

fix();

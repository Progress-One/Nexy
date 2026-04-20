import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data } = await supabase
    .from('scenes')
    .select('slug, image_variants, shared_images_with')
    .in('slug', [
      'spanking-he-spanks-her-give',
      'spanking-he-spanks-her-receive',
      'onboarding-rough-give-hetero-m',  // man dominates woman
      'onboarding-rough-receive-hetero-f', // woman receives rough
    ]);

  for (const s of data || []) {
    const v = s.image_variants?.filter((x: any) => !x.is_placeholder)?.length || 0;
    console.log(`${s.slug}: variants=${v}, shared=${s.shared_images_with ? 'yes' : 'no'}`);
  }
}

check();

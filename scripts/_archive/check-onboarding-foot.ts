import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active, user_description')
    .ilike('slug', 'onboarding-foot%')
    .order('slug');

  console.log('=== Onboarding foot scenes ===\n');

  for (const s of scenes || []) {
    const status = s.is_active ? '✅' : '❌';
    const desc = s.user_description?.ru || s.user_description?.en || 'no description';
    console.log(`${status} ${s.slug}`);
    console.log(`   "${desc}"\n`);
  }
}

run();

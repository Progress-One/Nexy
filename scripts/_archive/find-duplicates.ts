import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function find() {
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, user_description, is_active')
    .eq('category', 'onboarding')
    .order('slug');

  // Find scenes with same RU description
  const byDesc: Record<string, string[]> = {};
  data?.forEach(s => {
    const desc = s.user_description?.ru;
    if (desc) {
      if (!byDesc[desc]) byDesc[desc] = [];
      const status = s.is_active === false ? ' [INACTIVE]' : '';
      byDesc[desc].push(s.slug + status);
    }
  });

  console.log('=== SCENES WITH DUPLICATE RU DESCRIPTIONS ===\n');

  let found = false;
  Object.entries(byDesc).forEach(([desc, slugs]) => {
    if (slugs.length > 1) {
      found = true;
      console.log(`"${desc.substring(0, 60)}..."`);
      slugs.forEach(s => console.log(`  - ${s}`));
      console.log('');
    }
  });

  if (!found) {
    console.log('No duplicates found.');
  }

  // Also check specifically for lingerie
  console.log('\n=== ALL LINGERIE ONBOARDING SCENES ===\n');
  data?.filter(s => s.slug?.includes('lingerie')).forEach(s => {
    const status = s.is_active === false ? ' [INACTIVE]' : '';
    console.log(`${s.slug}${status}`);
    console.log(`  RU: ${s.user_description?.ru || '(empty)'}`);
    console.log('');
  });
}

find();

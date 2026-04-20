import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function analyze() {
  // Get onboarding scenes
  const { data: onboarding } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .eq('category', 'onboarding')
    .neq('is_active', false);

  // Get worship-service scenes
  const { data: worship } = await supabase
    .from('scenes')
    .select('slug, user_description')
    .eq('category', 'worship-service');

  // Get other categories that might overlap
  const { data: other } = await supabase
    .from('scenes')
    .select('slug, user_description, category')
    .not('category', 'in', '("onboarding","worship-service")')
    .neq('is_active', false);

  console.log('=== WORSHIP-SERVICE SCENES ===\n');
  worship?.forEach(s => {
    console.log(`${s.slug}`);
    console.log(`  ${s.user_description?.ru?.substring(0, 60)}`);
  });

  console.log('\n\n=== POTENTIAL MATCHES ===\n');

  // Keywords to match
  const matches = [
    { worship: 'foot-worship', onboarding: 'foot', keyword: 'ступн|feet|foot' },
    { worship: 'cock-worship', onboarding: 'oral', keyword: 'член|cock|рот|mouth' },
    { worship: 'pussy-worship', onboarding: 'oral', keyword: 'киск|pussy|язык' },
    { worship: 'body-worship', onboarding: 'praise', keyword: 'тело|body|целу' },
    { worship: 'armpit', onboarding: null, keyword: 'подмышк|armpit' },
  ];

  matches.forEach(m => {
    const worshipScenes = worship?.filter(s => s.slug.includes(m.worship)) || [];
    const onboardingScenes = onboarding?.filter(s => s.slug.includes(m.onboarding || '___')) || [];

    if (worshipScenes.length > 0) {
      console.log(`\n${m.worship.toUpperCase()}:`);
      console.log(`  Worship scenes: ${worshipScenes.map(s => s.slug).join(', ')}`);
      console.log(`  Onboarding matches: ${onboardingScenes.map(s => s.slug.replace('onboarding-', '')).join(', ') || 'NONE'}`);
    }
  });
}

analyze();

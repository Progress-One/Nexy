import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active');

  const active = (scenes || []).filter(s => s.is_active);
  const inactive = (scenes || []).filter(s => !s.is_active);

  // Categorize active scenes
  const onboarding = active.filter(s => s.slug.startsWith('onboarding-'));
  const giveReceive = active.filter(s =>
    (s.slug.endsWith('-give') || s.slug.endsWith('-receive')) &&
    !s.slug.startsWith('onboarding-')
  );
  const other = active.filter(s =>
    !s.slug.startsWith('onboarding-') &&
    !s.slug.endsWith('-give') &&
    !s.slug.endsWith('-receive')
  );

  console.log('=== Active scenes breakdown ===\n');
  console.log(`Total active: ${active.length}`);
  console.log(`  - Onboarding: ${onboarding.length}`);
  console.log(`  - Give/Receive variants: ${giveReceive.length}`);
  console.log(`  - Other (base/standalone): ${other.length}`);

  console.log(`\nInactive: ${inactive.length}`);

  // Show "other" scenes (should be few now)
  if (other.length > 0) {
    console.log('\n=== Other active scenes (not onboarding, not -give/-receive) ===\n');
    for (const s of other.sort((a, b) => a.slug.localeCompare(b.slug))) {
      console.log(`  ${s.slug}`);
    }
  }

  // Check foot-worship specifically
  const foot = (scenes || []).filter(s => s.slug.includes('foot-worship') && !s.slug.startsWith('onboarding'));
  console.log('\n=== Foot-worship scenes ===\n');
  for (const s of foot.sort((a, b) => a.slug.localeCompare(b.slug))) {
    console.log(`  ${s.is_active ? '✅' : '❌'} ${s.slug}`);
  }
}

run();

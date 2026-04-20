import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active');

  const activeSet = new Set((scenes || []).filter(s => s.is_active).map(s => s.slug));

  // Find base scenes that are inactive but have active variants
  // EXCEPT foot-worship (those should stay deactivated)
  const toReactivate: string[] = [];

  for (const s of scenes || []) {
    if (s.is_active) continue;
    if (s.slug.startsWith('onboarding-')) continue;
    if (s.slug.endsWith('-give') || s.slug.endsWith('-receive')) continue;

    // Skip foot-worship - user wanted those deactivated
    if (s.slug.includes('foot-worship')) continue;

    // Check if has active variants (meaning we wrongly deactivated)
    const hasActiveGive = activeSet.has(`${s.slug}-give`);
    const hasActiveReceive = activeSet.has(`${s.slug}-receive`);

    if (hasActiveGive || hasActiveReceive) {
      toReactivate.push(s.slug);
    }
  }

  console.log(`Found ${toReactivate.length} base scenes to reactivate:\n`);
  for (const slug of toReactivate.slice(0, 20)) {
    console.log(`  ${slug}`);
  }
  if (toReactivate.length > 20) {
    console.log(`  ... and ${toReactivate.length - 20} more`);
  }

  const { data, error } = await supabase
    .from('scenes')
    .update({ is_active: true })
    .in('slug', toReactivate)
    .select('slug');

  if (error) {
    console.log('\n❌ Error:', error.message);
  } else {
    console.log(`\n✅ Reactivated ${data?.length || 0} base scenes`);
  }

  // Verify foot-worship stayed deactivated
  const { data: footScenes } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .ilike('slug', 'foot-worship%');

  console.log('\n=== Foot-worship status (should have base inactive) ===');
  for (const s of (footScenes || []).sort((a,b) => a.slug.localeCompare(b.slug))) {
    console.log(`  ${s.is_active ? '✅' : '❌'} ${s.slug}`);
  }
}

run();

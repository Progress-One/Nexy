import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  // Get all active scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .eq('is_active', true);

  // Find triads: base scenes that have both -give and -receive variants
  const slugSet = new Set((scenes || []).map(s => s.slug));

  const baseSlugsToDeactivate: string[] = [];

  for (const s of scenes || []) {
    // Skip if already a variant
    if (s.slug.endsWith('-give') || s.slug.endsWith('-receive')) continue;
    // Skip onboarding
    if (s.slug.startsWith('onboarding-')) continue;

    // Check if both variants exist and are active
    const hasGive = slugSet.has(`${s.slug}-give`);
    const hasReceive = slugSet.has(`${s.slug}-receive`);

    if (hasGive && hasReceive) {
      baseSlugsToDeactivate.push(s.slug);
    }
  }

  console.log(`Found ${baseSlugsToDeactivate.length} base scenes to deactivate:\n`);

  // Show first 20
  for (const slug of baseSlugsToDeactivate.slice(0, 20)) {
    console.log(`  ${slug}`);
  }
  if (baseSlugsToDeactivate.length > 20) {
    console.log(`  ... and ${baseSlugsToDeactivate.length - 20} more`);
  }

  // Dry run - uncomment to actually deactivate
  const DRY_RUN = false;

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - no changes made');
    console.log('Set DRY_RUN = false to actually deactivate');
  } else {
    const { data, error } = await supabase
      .from('scenes')
      .update({ is_active: false })
      .in('slug', baseSlugsToDeactivate)
      .select('slug');

    if (error) {
      console.log('\n❌ Error:', error.message);
    } else {
      console.log(`\n✅ Deactivated ${data?.length || 0} base scenes`);
    }
  }
}

run();

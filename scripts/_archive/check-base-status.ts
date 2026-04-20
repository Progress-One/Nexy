import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .not('slug', 'like', 'onboarding-%');

  const all = scenes || [];

  // Group by base slug
  const byBase: Record<string, { base?: boolean; give?: boolean; receive?: boolean }> = {};

  for (const s of all) {
    const isGive = s.slug.endsWith('-give');
    const isReceive = s.slug.endsWith('-receive');
    const baseSlug = s.slug.replace(/-(give|receive)$/, '');

    if (!byBase[baseSlug]) byBase[baseSlug] = {};

    if (isGive) {
      byBase[baseSlug].give = s.is_active;
    } else if (isReceive) {
      byBase[baseSlug].receive = s.is_active;
    } else {
      byBase[baseSlug].base = s.is_active;
    }
  }

  // Categorize
  const standalone: string[] = []; // base active, no variants
  const withVariants: string[] = []; // base inactive, variants active
  const allInactive: string[] = []; // everything inactive
  const mixed: string[] = []; // base active AND variants exist

  for (const [slug, status] of Object.entries(byBase)) {
    const hasVariants = status.give !== undefined || status.receive !== undefined;
    const baseActive = status.base === true;
    const variantsActive = status.give === true || status.receive === true;

    if (!hasVariants && baseActive) {
      standalone.push(slug);
    } else if (!baseActive && variantsActive) {
      withVariants.push(slug);
    } else if (baseActive && hasVariants) {
      mixed.push(slug);
    } else if (!baseActive && !variantsActive) {
      allInactive.push(slug);
    }
  }

  console.log(`=== Scene Architecture Summary ===\n`);
  console.log(`Standalone (base active, no variants): ${standalone.length}`);
  console.log(`With variants (base inactive, variants active): ${withVariants.length}`);
  console.log(`Mixed (base AND variants active): ${mixed.length}`);
  console.log(`All inactive: ${allInactive.length}`);

  if (mixed.length > 0) {
    console.log(`\n⚠️ MIXED (might need fixing):`);
    for (const s of mixed.sort()) {
      console.log(`  ${s}`);
    }
  }

  console.log(`\n=== Standalone scenes (${standalone.length}) ===`);
  for (const s of standalone.sort().slice(0, 30)) {
    console.log(`  ${s}`);
  }
  if (standalone.length > 30) console.log(`  ... and ${standalone.length - 30} more`);
}

run();

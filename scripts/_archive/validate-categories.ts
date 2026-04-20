import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Official categories from docs/scenes/v2/README.md
const OFFICIAL_CATEGORIES = [
  'baseline',
  'body-fluids',
  'oral',
  'impact-pain',
  'verbal',
  'control-power',
  'cnc-rough',
  'worship-service',
  'massage',
  'pet-play',
  'age-play',
  'chastity',
  'group',
  'lgbtq',
  'exhibitionism',
  'anal',
  'cuckold',
  'sensory',
  'roleplay',
  'toys',
  'intimacy-outside',
  'symmetric',
  'clothing',
  'romantic',
  'extreme',
  'emotional-context',
  'manual',
  'filming',
  'solo-mutual',
  // Additional
  'onboarding',
  'hotwife',
  'voyeurism',
  'spontaneous',
  'rough',
  'intimacy',
  'control', // might be legacy
];

async function validate() {
  const { data } = await supabase
    .from('scenes')
    .select('category')
    .eq('is_active', true);

  const dbCategories: Record<string, number> = {};
  data?.forEach(s => {
    dbCategories[s.category] = (dbCategories[s.category] || 0) + 1;
  });

  console.log('Category Validation Report\n');
  console.log('='.repeat(60));

  // Check for non-standard categories
  const nonStandard: string[] = [];
  const needsRename: Array<{ from: string; to: string; count: number }> = [];

  Object.entries(dbCategories).sort().forEach(([cat, count]) => {
    const isOfficial = OFFICIAL_CATEGORIES.includes(cat);

    // Check if it's a underscore variant of an official category
    const hyphenVersion = cat.replace(/_/g, '-');
    const isUnderscoreVariant = !isOfficial && OFFICIAL_CATEGORIES.includes(hyphenVersion);

    if (isUnderscoreVariant) {
      needsRename.push({ from: cat, to: hyphenVersion, count });
      console.log(`⚠️  ${cat.padEnd(25)} ${String(count).padStart(3)} scenes → rename to: ${hyphenVersion}`);
    } else if (!isOfficial) {
      nonStandard.push(cat);
      console.log(`❓ ${cat.padEnd(25)} ${String(count).padStart(3)} scenes (not in docs)`);
    } else {
      console.log(`✓  ${cat.padEnd(25)} ${String(count).padStart(3)} scenes`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\nSummary:');
  console.log(`  Total categories: ${Object.keys(dbCategories).length}`);
  console.log(`  Official: ${Object.keys(dbCategories).length - needsRename.length - nonStandard.length}`);
  console.log(`  Need rename (underscore→hyphen): ${needsRename.length}`);
  console.log(`  Non-standard: ${nonStandard.length}`);

  if (needsRename.length > 0) {
    console.log('\n\nSQL to fix:');
    needsRename.forEach(({ from, to }) => {
      console.log(`UPDATE scenes SET category = '${to}' WHERE category = '${from}';`);
    });
  }

  if (nonStandard.length > 0) {
    console.log('\n\nNon-standard categories to review:');
    nonStandard.forEach(cat => console.log(`  - ${cat}`));
  }
}

validate().catch(console.error);

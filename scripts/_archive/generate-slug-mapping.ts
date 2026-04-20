import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Old slugs from SCENE_GATES that might be wrong
const OLD_SLUGS = [
  'golden-shower-m-to-f', 'golden-shower-f-to-m',
  'spitting-m-to-f', 'spitting-f-to-m',
  'body-worship-m-to-f', 'body-worship-f-to-m',
  'foot-worship-m-to-f', 'foot-worship-f-to-m',
  'spanking-m-to-f', 'spanking-f-to-m',
  'choking-m-to-f', 'choking-f-to-m',
  'face-slapping-m-to-f', 'face-slapping-f-to-m',
  'whipping-m-to-f', 'whipping-f-to-m',
  'wax-play-m-to-f', 'wax-play-f-to-m',
  'nipple-play-m-to-f', 'nipple-play-f-to-m',
  'degradation-m-to-f', 'degradation-f-to-m',
  'praise-m-to-f', 'praise-f-to-m',
  'bondage-m-ties-f', 'bondage-f-ties-m',
  'collar-m-owns-f', 'collar-f-owns-m',
  'chastity-m-locked', 'chastity-f-locked',
  'cnc-m-takes-f', 'cnc-f-takes-m',
  'swinging', 'hotwife',
  'glory-hole-f-gives', 'glory-hole-m-gives',
  'striptease-f', 'striptease-m',
  'stranger',
  'pet-play-f-is-pet', 'pet-play-m-is-pet',
  'ddlg', 'mdlb',
  'vibrator', 'dildo', 'remote-control',
  'lingerie-f', 'lingerie-m', 'stockings',
  'harness-f', 'harness-m', 'uniforms-f', 'uniforms-m',
  'massage-m-to-f', 'massage-f-to-m',
];

async function run() {
  // Get all active scene slugs
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug')
    .eq('is_active', true);

  const dbSlugs = new Set(scenes?.map(s => s.slug) || []);
  const allSlugs = scenes?.map(s => s.slug) || [];

  console.log('// Slug mapping for onboarding-gates.ts\n');
  console.log('const SLUG_FIXES: Record<string, string> = {');

  for (const oldSlug of OLD_SLUGS) {
    if (dbSlugs.has(oldSlug)) {
      // Already correct
      continue;
    }

    // Try to find a match
    const parts = oldSlug.split('-');
    const keyword = parts[0];

    // Find scenes with this keyword
    const candidates = allSlugs.filter(s =>
      s.includes(keyword) &&
      !s.includes('-give') &&
      !s.includes('-receive') &&
      !s.includes('onboarding')
    );

    if (candidates.length > 0) {
      // Try to find best match
      let best = candidates[0];

      // For m-to-f patterns, prefer he-*-her
      if (oldSlug.includes('-m-to-f') || oldSlug.includes('-m-')) {
        const heMatch = candidates.find(c => c.includes('-he-') || c.includes('-him'));
        if (heMatch) best = heMatch;
      }
      // For f-to-m patterns, prefer she-*-him
      if (oldSlug.includes('-f-to-m') || oldSlug.includes('-f-') || oldSlug.includes('-f')) {
        const sheMatch = candidates.find(c => c.includes('-she-') || c.includes('-her'));
        if (sheMatch) best = sheMatch;
      }

      console.log(`  '${oldSlug}': '${best}',`);
    } else {
      console.log(`  // '${oldSlug}': NOT FOUND`);
    }
  }

  console.log('};');
}

run();

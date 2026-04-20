import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Copy of SCENE_GATES keys for comparison
const GATED_SLUGS = new Set([
  'blowjob', 'cunnilingus', 'deepthroat', 'facesitting-she-on-him', 'facesitting-he-on-her',
  'rimming-he-to-her', 'rimming-she-to-him', 'cock-worship', 'pussy-worship',
  'anal-play-on-her', 'anal-play-on-him', 'pegging', 'butt-plug', 'figging',
  'cum-where-to-finish', 'squirting', 'squirt-receiving', 'golden-shower-he-on-her',
  'golden-shower-she-on-him', 'spitting-he-on-her', 'spitting-she-on-him', 'breeding-kink',
  'body-worship-he-worships-her', 'body-worship-she-worships-him',
  'foot-worship-he-worships-her', 'foot-worship-she-worships-his', 'armpit',
  'spanking-he-spanks-her', 'spanking-she-spanks-him', 'choking-he-chokes-her',
  'choking-she-chokes-him', 'face-slapping-he-slaps-her', 'face-slapping-she-slaps-him',
  'whipping-m-to-f', 'whipping-f-to-m', 'wax-play-he-on-her', 'wax-play-she-on-him',
  'nipple-play-he-on-her', 'nipple-play-she-on-him', 'cbt',
  'dirty-talk', 'degradation-he-degrades-her', 'degradation-she-degrades-him',
  'praise-he-praises-her', 'praise-she-praises-him',
  'bondage-he-ties-her', 'bondage-she-ties-him', 'collar-he-owns-her', 'collar-she-owns-him',
  'orgasm-control-m-to-f', 'orgasm-control-f-to-m', 'free-use-f-available', 'free-use-m-available',
  'objectification-f', 'objectification-m', 'chastity-he-locked', 'chastity-she-locked', 'feminization',
  'cnc-he-takes-her', 'cnc-she-takes-him', 'primal', 'somnophilia-m-to-f', 'somnophilia-f-to-m',
  'breath-play-m-to-f', 'breath-play-f-to-m', 'knife-play-m-to-f', 'knife-play-f-to-m',
  'mummification-f', 'mummification-m', 'needle-play', 'fisting-m-to-f', 'fisting-f-to-m',
  'fucking-machine', 'electrostim',
  'threesome-fmf', 'threesome-mfm', 'gangbang', 'orgy', 'swinging-partner-swap', 'double-penetration',
  'cuckold', 'hotwife-vixen',
  'exhibitionism', 'voyeurism', 'public-sex', 'glory-hole-blowjob', 'glory-hole-cunnilingus',
  'female-striptease', 'male-striptease',
  'boss-m-secretary-f', 'boss-f-subordinate-m', 'teacher-m-student-f', 'teacher-f-student-m',
  'doctor-patient', 'stranger-roleplay', 'service-roleplay', 'taboo-roleplay',
  'pet-play-she-is-pet', 'pet-play-he-is-pet', 'daddy-dom-little-girl', 'mommy-dom-little-boy',
  'blindfold', 'ice-play', 'feather-tickle',
  'vibrator-play', 'dildo-play', 'cock-ring', 'nipple-clamps', 'remote-control-toy',
  'female-lingerie', 'male-lingerie', 'stockings-garters', 'heels-only',
  'female-harness', 'male-harness', 'latex-leather', 'female-uniforms', 'male-uniforms', 'torn-clothes',
  'filming', 'sexting', 'joi',
  'romantic-sex', 'emotional-sex', 'aftercare', 'quickie', 'first-time-together', 'makeup-sex', 'angry-sex',
  'massage-he-massages-her', 'massage-she-massages-him',
]);

function getBaseSlug(slug: string): string {
  return slug.replace(/-(give|receive)$/, '');
}

function isGated(slug: string): boolean {
  // Skip onboarding scenes - they have their own system
  if (slug.startsWith('onboarding-')) return true;

  // Check direct or base slug
  return GATED_SLUGS.has(slug) || GATED_SLUGS.has(getBaseSlug(slug));
}

async function run() {
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('slug, category, is_active');

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  const active = (scenes || []).filter(s => s.is_active);
  console.log('Total active scenes:', active.length);

  // Truly ungated scenes (excluding onboarding and -give/-receive variants)
  const ungated = active.filter(s => !isGated(s.slug));

  console.log(`\n=== TRULY ungated scenes: ${ungated.length} ===\n`);

  // Group by category
  const byCategory: Record<string, string[]> = {};
  for (const s of ungated) {
    const c = s.category || 'null';
    if (!byCategory[c]) byCategory[c] = [];
    byCategory[c].push(s.slug);
  }

  for (const [cat, slugs] of Object.entries(byCategory).sort((a,b) => a[0].localeCompare(b[0]))) {
    console.log(`\n${cat} (${slugs.length}):`);
    for (const slug of slugs.sort()) {
      const base = getBaseSlug(slug);
      const note = base !== slug ? ` [base: ${base}]` : '';
      console.log(`  ${slug}${note}`);
    }
  }

  // Foot scenes
  const foot = active.filter(s => s.slug.includes('foot') && !s.slug.startsWith('onboarding'));
  console.log(`\n=== Non-onboarding foot scenes (${foot.length}) ===`);
  for (const s of foot.sort((a,b) => a.slug.localeCompare(b.slug))) {
    const gated = isGated(s.slug) ? '[ok]' : '[NEEDS GATE]';
    console.log(`  ${gated} ${s.slug}`);
  }
}

run();

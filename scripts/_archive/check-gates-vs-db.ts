import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Copy of SCENE_GATES slugs
const GATE_SLUGS = [
  'blowjob', 'cunnilingus', 'deepthroat', 'facesitting-she-on-him', 'facesitting-he-on-her',
  'rimming-he-to-her', 'rimming-she-to-him', 'cock-worship', 'pussy-worship',
  'anal-play-on-her', 'anal-play-on-him', 'pegging', 'butt-plug', 'figging',
  'cum-where-to-finish', 'squirting', 'squirt-receiving', 'golden-shower-m-to-f',
  'golden-shower-f-to-m', 'spitting-m-to-f', 'spitting-f-to-m', 'breeding-kink',
  'body-worship-m-to-f', 'body-worship-f-to-m', 'foot-worship-m-to-f', 'foot-worship-f-to-m', 'armpit',
  'spanking-m-to-f', 'spanking-f-to-m', 'choking-m-to-f', 'choking-f-to-m',
  'face-slapping-m-to-f', 'face-slapping-f-to-m', 'whipping-m-to-f', 'whipping-f-to-m',
  'wax-play-m-to-f', 'wax-play-f-to-m', 'nipple-play-m-to-f', 'nipple-play-f-to-m', 'cbt',
  'dirty-talk', 'degradation-m-to-f', 'degradation-f-to-m', 'praise-m-to-f', 'praise-f-to-m',
  'bondage-m-ties-f', 'bondage-f-ties-m', 'collar-m-owns-f', 'collar-f-owns-m',
  'orgasm-control-m-to-f', 'orgasm-control-f-to-m', 'free-use-f-available', 'free-use-m-available',
  'objectification-f', 'objectification-m', 'chastity-m-locked', 'chastity-f-locked', 'feminization',
  'cnc-m-takes-f', 'cnc-f-takes-m', 'primal', 'somnophilia-m-to-f', 'somnophilia-f-to-m',
  'breath-play-m-to-f', 'breath-play-f-to-m', 'knife-play-m-to-f', 'knife-play-f-to-m',
  'mummification-f', 'mummification-m', 'needle-play', 'fisting-m-to-f', 'fisting-f-to-m',
  'fucking-machine', 'electrostim',
  'threesome-fmf', 'threesome-mfm', 'gangbang', 'orgy', 'swinging', 'double-penetration',
  'cuckold', 'hotwife',
  'exhibitionism', 'voyeurism', 'public-sex', 'glory-hole-f-gives', 'glory-hole-m-gives',
  'striptease-f', 'striptease-m',
  'boss-m-secretary-f', 'boss-f-subordinate-m', 'teacher-m-student-f', 'teacher-f-student-m',
  'doctor-patient', 'stranger', 'service-roleplay', 'taboo-roleplay',
  'pet-play-f-is-pet', 'pet-play-m-is-pet', 'ddlg', 'mdlb',
  'blindfold', 'ice-play', 'feather-tickle',
  'vibrator', 'dildo', 'cock-ring', 'nipple-clamps', 'remote-control',
  'lingerie-f', 'lingerie-m', 'stockings', 'heels-only', 'harness-f', 'harness-m',
  'latex-leather', 'uniforms-f', 'uniforms-m', 'torn-clothes',
  'filming', 'sexting', 'joi',
  'romantic-sex', 'emotional-sex', 'aftercare', 'quickie', 'first-time-together',
  'makeup-sex', 'angry-sex', 'massage-m-to-f', 'massage-f-to-m',
];

async function run() {
  // Get all scene slugs from DB
  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, is_active')
    .eq('is_active', true);

  const dbSlugs = new Set(scenes?.map(s => s.slug) || []);

  console.log('=== SCENE_GATES slugs NOT in DB ===\n');
  const notInDb = GATE_SLUGS.filter(slug => !dbSlugs.has(slug));
  for (const slug of notInDb) {
    console.log(`  ❌ ${slug}`);
  }

  console.log(`\nTotal: ${notInDb.length} missing`);

  // Find similar slugs in DB for missing ones
  if (notInDb.length > 0) {
    console.log('\n=== Possible matches ===\n');
    for (const missing of notInDb) {
      const parts = missing.split('-');
      const mainPart = parts[0];
      const similar = scenes?.filter(s => s.slug.includes(mainPart)).map(s => s.slug);
      if (similar && similar.length > 0) {
        console.log(`${missing} → maybe: ${similar.join(', ')}`);
      }
    }
  }
}

run();

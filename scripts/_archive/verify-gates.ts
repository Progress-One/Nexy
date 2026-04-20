import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Copy of SCENE_GATES from onboarding-gates.ts (after fixes)
const SCENE_GATES: Record<string, { gates: string[]; operator: 'AND' | 'OR'; level?: string }> = {
  // ORAL
  blowjob: { gates: ['oral'], operator: 'AND' },
  cunnilingus: { gates: ['oral'], operator: 'AND' },
  deepthroat: { gates: ['oral'], operator: 'AND' },
  'facesitting-she-on-him': { gates: ['oral'], operator: 'AND' },
  'facesitting-he-on-her': { gates: ['oral'], operator: 'AND' },
  'rimming-he-to-her': { gates: ['oral'], operator: 'AND' },
  'rimming-she-to-him': { gates: ['oral'], operator: 'AND' },
  'cock-worship': { gates: ['oral'], operator: 'AND' },
  'pussy-worship': { gates: ['oral'], operator: 'AND' },

  // ANAL
  'anal-play-on-her': { gates: ['anal'], operator: 'AND' },
  'anal-play-on-him': { gates: ['anal'], operator: 'AND' },
  pegging: { gates: ['anal', 'power_dynamic'], operator: 'AND' },
  'butt-plug': { gates: ['anal', 'toys'], operator: 'OR' },
  figging: { gates: ['anal', 'rough'], operator: 'AND' },

  // BODY FLUIDS
  'cum-where-to-finish': { gates: ['body_fluids'], operator: 'AND' },
  squirting: { gates: ['body_fluids'], operator: 'AND' },
  'squirt-receiving': { gates: ['body_fluids', 'oral'], operator: 'AND' },
  'golden-shower-he-on-her': { gates: ['body_fluids'], operator: 'AND' },
  'golden-shower-she-on-him': { gates: ['body_fluids'], operator: 'AND' },
  'spitting-he-on-her': { gates: ['body_fluids', 'power_dynamic'], operator: 'AND' },
  'spitting-she-on-him': { gates: ['body_fluids', 'power_dynamic'], operator: 'AND' },
  'breeding-kink': { gates: ['body_fluids'], operator: 'AND' },

  // WORSHIP
  'body-worship-he-worships-her': { gates: ['romantic'], operator: 'AND' },
  'body-worship-she-worships-him': { gates: ['romantic'], operator: 'AND' },
  'foot-worship-he-worships-her': { gates: ['foot'], operator: 'AND' },
  'foot-worship-she-worships-his': { gates: ['foot'], operator: 'AND' },
  armpit: { gates: ['body_fluids', 'rough'], operator: 'OR' },

  // IMPACT/PAIN
  'spanking-he-spanks-her': { gates: ['rough'], operator: 'AND' },
  'spanking-she-spanks-him': { gates: ['rough'], operator: 'AND' },
  'choking-he-chokes-her': { gates: ['rough'], operator: 'AND' },
  'choking-she-chokes-him': { gates: ['rough'], operator: 'AND' },
  'face-slapping-he-slaps-her': { gates: ['rough'], operator: 'AND', level: 'very' },
  'face-slapping-she-slaps-him': { gates: ['rough'], operator: 'AND', level: 'very' },
  'whipping-m-to-f': { gates: ['rough', 'bondage'], operator: 'AND' },
  'whipping-f-to-m': { gates: ['rough', 'bondage'], operator: 'AND' },
  'wax-play-he-on-her': { gates: ['rough', 'toys'], operator: 'OR' },
  'wax-play-she-on-him': { gates: ['rough', 'toys'], operator: 'OR' },
  'nipple-play-he-on-her': { gates: ['rough', 'toys'], operator: 'OR' },
  'nipple-play-she-on-him': { gates: ['rough', 'toys'], operator: 'OR' },
  cbt: { gates: ['rough', 'power_dynamic'], operator: 'AND' },

  // VERBAL
  'dirty-talk': { gates: ['dirty_talk'], operator: 'AND' },
  'degradation-he-degrades-her': { gates: ['dirty_talk', 'power_dynamic'], operator: 'AND' },
  'degradation-she-degrades-him': { gates: ['dirty_talk', 'power_dynamic'], operator: 'AND' },
  'praise-he-praises-her': { gates: ['praise'], operator: 'AND' },
  'praise-she-praises-him': { gates: ['praise'], operator: 'AND' },

  // CONTROL/POWER
  'bondage-he-ties-her': { gates: ['bondage'], operator: 'AND' },
  'bondage-she-ties-him': { gates: ['bondage'], operator: 'AND' },
  'collar-he-owns-her': { gates: ['power_dynamic'], operator: 'AND' },
  'collar-she-owns-him': { gates: ['power_dynamic'], operator: 'AND' },
  'orgasm-control-m-to-f': { gates: ['power_dynamic'], operator: 'AND' },
  'orgasm-control-f-to-m': { gates: ['power_dynamic'], operator: 'AND' },
  'free-use-f-available': { gates: ['power_dynamic'], operator: 'AND' },
  'free-use-m-available': { gates: ['power_dynamic'], operator: 'AND' },
  'objectification-f': { gates: ['power_dynamic'], operator: 'AND' },
  'objectification-m': { gates: ['power_dynamic'], operator: 'AND' },
  'chastity-he-locked': { gates: ['power_dynamic'], operator: 'AND' },
  'chastity-she-locked': { gates: ['power_dynamic'], operator: 'AND' },
  feminization: { gates: ['power_dynamic'], operator: 'AND' },

  // CNC/ROUGH
  'cnc-he-takes-her': { gates: ['rough'], operator: 'AND', level: 'very' },
  'cnc-she-takes-him': { gates: ['rough'], operator: 'AND', level: 'very' },
  primal: { gates: ['rough'], operator: 'AND' },
  'somnophilia-m-to-f': { gates: ['power_dynamic'], operator: 'AND' },
  'somnophilia-f-to-m': { gates: ['power_dynamic'], operator: 'AND' },

  // EXTREME
  'breath-play-m-to-f': { gates: ['rough', 'bondage'], operator: 'AND', level: 'very' },
  'breath-play-f-to-m': { gates: ['rough', 'bondage'], operator: 'AND', level: 'very' },
  'knife-play-m-to-f': { gates: ['rough', 'bondage'], operator: 'AND', level: 'very' },
  'knife-play-f-to-m': { gates: ['rough', 'bondage'], operator: 'AND', level: 'very' },
  'mummification-f': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'mummification-m': { gates: ['bondage'], operator: 'AND', level: 'very' },
  'needle-play': { gates: ['rough', 'bondage'], operator: 'AND', level: 'very' },
  'fisting-m-to-f': { gates: ['anal', 'power_dynamic'], operator: 'OR', level: 'very' },
  'fisting-f-to-m': { gates: ['anal', 'power_dynamic'], operator: 'OR', level: 'very' },
  'fucking-machine': { gates: ['toys'], operator: 'AND' },
  electrostim: { gates: ['toys'], operator: 'AND' },

  // GROUP
  'threesome-fmf': { gates: ['group'], operator: 'AND' },
  'threesome-mfm': { gates: ['group'], operator: 'AND' },
  gangbang: { gates: ['group'], operator: 'AND', level: 'very' },
  orgy: { gates: ['group'], operator: 'AND', level: 'very' },
  'swinging-partner-swap': { gates: ['group'], operator: 'AND' },
  'double-penetration': { gates: ['group', 'anal'], operator: 'AND' },

  // CUCKOLD
  cuckold: { gates: ['group', 'power_dynamic'], operator: 'AND' },
  'hotwife-vixen': { gates: ['group', 'power_dynamic'], operator: 'AND' },

  // EXHIBITIONISM
  exhibitionism: { gates: ['exhibitionism'], operator: 'AND' },
  voyeurism: { gates: ['exhibitionism'], operator: 'AND' },
  'public-sex': { gates: ['public'], operator: 'AND' },
  'glory-hole-blowjob': { gates: ['exhibitionism', 'oral'], operator: 'AND' },
  'glory-hole-cunnilingus': { gates: ['exhibitionism', 'oral'], operator: 'AND' },
  'female-striptease': { gates: ['exhibitionism'], operator: 'AND' },
  'male-striptease': { gates: ['exhibitionism'], operator: 'AND' },

  // ROLEPLAY
  'boss-m-secretary-f': { gates: ['roleplay'], operator: 'AND' },
  'boss-f-subordinate-m': { gates: ['roleplay'], operator: 'AND' },
  'teacher-m-student-f': { gates: ['roleplay'], operator: 'AND' },
  'teacher-f-student-m': { gates: ['roleplay'], operator: 'AND' },
  'doctor-patient': { gates: ['roleplay'], operator: 'AND' },
  'stranger-roleplay': { gates: ['roleplay'], operator: 'AND' },
  'service-roleplay': { gates: ['roleplay', 'power_dynamic'], operator: 'AND' },
  'taboo-roleplay': { gates: ['roleplay'], operator: 'AND', level: 'very' },
  'pet-play-she-is-pet': { gates: ['roleplay', 'power_dynamic'], operator: 'AND' },
  'pet-play-he-is-pet': { gates: ['roleplay', 'power_dynamic'], operator: 'AND' },
  'daddy-dom-little-girl': { gates: ['roleplay', 'power_dynamic'], operator: 'AND' },
  'mommy-dom-little-boy': { gates: ['roleplay', 'power_dynamic'], operator: 'AND' },

  // SENSORY
  blindfold: { gates: ['power_dynamic', 'romantic'], operator: 'OR' },
  'ice-play': { gates: ['romantic', 'toys'], operator: 'OR' },
  'feather-tickle': { gates: ['romantic'], operator: 'AND' },

  // TOYS
  'vibrator-play': { gates: ['toys'], operator: 'AND' },
  'dildo-play': { gates: ['toys'], operator: 'AND' },
  'cock-ring': { gates: ['toys'], operator: 'AND' },
  'nipple-clamps': { gates: ['toys', 'rough'], operator: 'AND' },
  'remote-control-toy': { gates: ['toys', 'public'], operator: 'AND' },

  // CLOTHING
  'female-lingerie': { gates: ['lingerie'], operator: 'AND' },
  'male-lingerie': { gates: ['lingerie'], operator: 'AND' },
  'stockings-garters': { gates: ['lingerie'], operator: 'AND' },
  'heels-only': { gates: ['lingerie'], operator: 'AND' },
  'female-harness': { gates: ['lingerie'], operator: 'AND' },
  'male-harness': { gates: ['lingerie'], operator: 'AND' },
  'latex-leather': { gates: ['lingerie'], operator: 'AND' },
  'female-uniforms': { gates: ['lingerie', 'roleplay'], operator: 'AND' },
  'male-uniforms': { gates: ['lingerie', 'roleplay'], operator: 'AND' },
  'torn-clothes': { gates: ['rough'], operator: 'AND' },

  // FILMING
  filming: { gates: ['recording'], operator: 'AND' },
  sexting: { gates: ['recording', 'exhibitionism'], operator: 'OR' },
  joi: { gates: ['recording', 'power_dynamic'], operator: 'OR' },

  // ROMANTIC
  'romantic-sex': { gates: ['romantic'], operator: 'AND' },
  'emotional-sex': { gates: ['romantic'], operator: 'AND' },
  aftercare: { gates: ['romantic', 'power_dynamic'], operator: 'OR' },
  quickie: { gates: ['quickie'], operator: 'AND' },
  'first-time-together': { gates: ['romantic'], operator: 'AND' },
  'makeup-sex': { gates: ['romantic'], operator: 'AND' },
  'angry-sex': { gates: ['rough', 'quickie'], operator: 'OR' },
  'massage-he-massages-her': { gates: ['romantic'], operator: 'AND' },
  'massage-she-massages-him': { gates: ['romantic'], operator: 'AND' },
};

async function run() {
  // Get all scene slugs from DB (including inactive)
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('slug, is_active');

  if (error) {
    console.error('Error fetching scenes:', error.message);
    return;
  }

  const dbSlugs = new Set(scenes?.map(s => s.slug) || []);
  const activeSlugs = new Set(scenes?.filter(s => s.is_active).map(s => s.slug) || []);

  console.log('=== Verifying SCENE_GATES slugs ===\n');

  const missing: string[] = [];
  const inactive: string[] = [];
  const found: string[] = [];

  for (const slug of Object.keys(SCENE_GATES)) {
    if (!dbSlugs.has(slug)) {
      missing.push(slug);
    } else if (!activeSlugs.has(slug)) {
      inactive.push(slug);
    } else {
      found.push(slug);
    }
  }

  console.log(`✅ Found and active: ${found.length}`);
  console.log(`⚠️  Found but inactive: ${inactive.length}`);
  console.log(`❌ Not in DB: ${missing.length}`);

  if (inactive.length > 0) {
    console.log('\n⚠️  Inactive scenes:');
    for (const slug of inactive) {
      console.log(`  ${slug}`);
    }
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing from DB:');
    for (const slug of missing) {
      console.log(`  ${slug}`);
    }
  }

  console.log(`\nTotal in SCENE_GATES: ${Object.keys(SCENE_GATES).length}`);
}

run();

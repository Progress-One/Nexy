/**
 * V3 Migration Script: Add clarification_for to all composite scenes
 *
 * This script:
 * 1. Adds `scene_type: 'clarification'` to all composite scenes
 * 2. Adds `clarification_for` array based on CLARIFICATION_MAPPING
 * 3. Fixes paired_scene references (underscore → hyphen)
 * 4. Adds missing paired_scene for 12 scenes
 * 5. Removes deprecated `elements[]` field
 *
 * Run: npx tsx scripts/add-clarification-for.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'composite');

// Complete clarification mapping from plan
const CLARIFICATION_MAPPING: Record<string, string[]> = {
  // ORAL
  'blowjob': ['oral-preference', 'oral-receive'],
  'cunnilingus': ['oral-preference', 'oral-give'],
  'deepthroat': ['oral-preference', 'blowjob'],
  'facesitting-f-on-m': ['oral-preference', 'power-dom'],
  'facesitting-m-on-f': ['oral-preference', 'power-dom'],
  'rimming-m-to-f': ['oral-preference', 'anal-interest'],
  'rimming-f-to-m': ['oral-preference', 'anal-interest'],
  'finger-sucking': ['oral-preference'],

  // ANAL
  'anal-play-on-her': ['anal-interest', 'anal-give'],
  'anal-play-on-him': ['anal-interest', 'anal-receive'],
  'pegging': ['anal-interest', 'anal-receive', 'power-sub'],
  'figging': ['anal-interest'],
  'fisting-m-to-f': ['anal-give'],
  'fisting-f-to-m': ['anal-receive'],

  // CONTROL-POWER
  'bondage-m-ties-f': ['power-dom', 'bondage-give'],
  'bondage-f-ties-m': ['power-sub', 'bondage-receive'],
  'collar-m-owns-f': ['power-dom'],
  'collar-f-owns-m': ['power-sub'],
  'edging-m-to-f': ['power-dom', 'orgasm-control'],
  'edging-f-to-m': ['power-sub', 'orgasm-control'],
  'feminization': ['power-sub'],
  'free-use-f-available': ['power-dom', 'power-sub'],
  'free-use-m-available': ['power-dom', 'power-sub'],
  'forced-orgasm-m-to-f': ['power-dom'],
  'forced-orgasm-f-to-m': ['power-sub'],
  'orgasm-control': ['power-dom', 'power-sub'],
  'ruined-orgasm-m-to-f': ['power-dom'],
  'ruined-orgasm-f-to-m': ['power-sub'],
  'sex-tasks': ['power-dom', 'power-sub'],

  // IMPACT-PAIN
  'spanking-m-to-f': ['rough-give', 'pain-tolerance'],
  'spanking-f-to-m': ['rough-receive', 'pain-tolerance'],
  'wax-play-m-to-f': ['pain-tolerance', 'sensory'],
  'wax-play-f-to-m': ['pain-tolerance', 'sensory'],
  'choking-m-to-f': ['rough-give'],
  'choking-f-to-m': ['rough-receive'],
  'nipple-play-m-to-f': ['pain-tolerance'],
  'nipple-play-f-to-m': ['pain-tolerance'],
  'face-slapping-m-to-f': ['rough-give', 'degradation'],
  'face-slapping-f-to-m': ['rough-receive'],
  'cbt': ['pain-tolerance'],
  'breath-play-m-to-f': ['rough-give'],
  'breath-play-f-to-m': ['rough-receive'],
  'knife-play-m-to-f': ['rough-give', 'power-dom'],
  'knife-play-f-to-m': ['rough-receive', 'power-sub'],
  'needle-play': ['pain-tolerance', 'bondage'],
  'whipping-m-to-f': ['rough-give', 'pain-tolerance'],
  'whipping-f-to-m': ['rough-receive', 'pain-tolerance'],
  'wax-play': ['pain-tolerance', 'sensory'],

  // CNC-ROUGH
  'cnc-m-takes-f': ['rough-give', 'power-dom'],
  'cnc-f-takes-m': ['rough-receive', 'power-sub'],
  'primal': ['rough-give', 'rough-receive'],
  'somnophilia-m-to-f': ['power-dom', 'free-use'],
  'somnophilia-f-to-m': ['power-sub', 'free-use'],

  // VERBAL
  'praise-m-to-f': ['praise-give', 'verbal-preference'],
  'praise-f-to-m': ['praise-receive', 'verbal-preference'],
  'degradation-m-to-f': ['dirty-talk-give', 'power-dom'],
  'degradation-f-to-m': ['dirty-talk-receive', 'power-sub'],
  'dirty-talk': ['dirty-talk-give', 'dirty-talk-receive'],
  'moaning-and-screaming': ['verbal-preference'],

  // CLOTHING
  'lingerie-f': ['lingerie'],
  'lingerie-m': ['lingerie'],
  'stockings': ['lingerie'],
  'heels-only': ['lingerie', 'foot-receive'],
  'latex-leather': ['lingerie'],
  'harness-f': ['lingerie'],
  'harness-m': ['lingerie'],
  'uniforms-f': ['lingerie', 'roleplay'],
  'uniforms-m': ['lingerie', 'roleplay'],
  'torn-clothes': ['rough-give', 'rough-receive'],

  // EXHIBITIONISM
  'exhibitionism': ['exhibitionism'],
  'voyeurism': ['exhibitionism'],
  'striptease-f': ['exhibitionism'],
  'striptease-m': ['exhibitionism'],
  'public-sex': ['public', 'exhibitionism'],
  'glory-hole-f-gives': ['exhibitionism', 'oral-receive', 'public'],
  'glory-hole-m-gives': ['exhibitionism', 'oral-give', 'public'],
  'dress-code': ['exhibitionism', 'lingerie'],
  'no-panties-walk': ['exhibitionism', 'public'],

  // TOYS
  'cock-ring': ['toys-interest'],
  'butt-plug': ['toys-interest', 'anal-interest'],
  'nipple-clamps': ['toys-interest', 'pain-tolerance'],
  'remote-control': ['toys-interest', 'public'],
  'fucking-machine': ['toys-interest'],
  'dildo': ['toys-interest'],
  'toy-wand': ['toys-interest'],
  'toy-beads': ['toys-interest', 'anal-interest'],
  'toy-clitoral': ['toys-interest'],
  'toy-plug-small': ['toys-interest', 'anal-interest'],
  'toy-plug-large': ['toys-interest', 'anal-interest'],
  'sex-swing': ['toys-interest', 'positions'],
  'anal-hook': ['anal-interest', 'bondage-give', 'bondage-receive'],

  // GROUP
  'threesome-fmf': ['group'],
  'threesome-mfm': ['group'],
  'gangbang': ['group'],
  'orgy': ['group'],
  'swinging': ['group'],
  'double-penetration': ['group', 'anal-interest'],
  'cuckold': ['group', 'power-sub'],
  'hotwife': ['group', 'power-dom'],

  // ROLEPLAY
  'boss-m-secretary-f': ['roleplay'],
  'boss-f-subordinate-m': ['roleplay'],
  'teacher-m-student-f': ['roleplay'],
  'teacher-f-student-m': ['roleplay'],
  'doctor-patient': ['roleplay'],
  'stranger': ['roleplay'],
  'service-roleplay': ['roleplay', 'power-sub'],
  'taboo-roleplay': ['roleplay'],
  'truth-or-dare': ['roleplay'],

  // PET-PLAY & AGE-PLAY
  'pet-play-f-is-pet': ['roleplay', 'power-dom'],
  'pet-play-m-is-pet': ['roleplay', 'power-sub'],
  'ddlg': ['roleplay', 'power-dom'],
  'mdlb': ['roleplay', 'power-sub'],

  // BODY-FLUIDS
  'cum-where-to-finish': ['finish-preference'],
  'finish-preference-m': ['finish-preference'],
  'finish-preference-f': ['finish-preference'],
  'squirting': ['finish-preference'],
  'squirt-receiving': ['oral-give', 'finish-preference'],
  'golden-shower-m-to-f': ['watersports'],
  'golden-shower-f-to-m': ['watersports'],
  'spitting-m-to-f': ['degradation-give', 'power-dom'],
  'spitting-f-to-m': ['degradation-receive', 'power-sub'],
  'breeding-kink': ['finish-preference'],

  // WORSHIP-SERVICE
  'foot-worship-m-to-f': ['foot-give', 'body-fetishes'],
  'foot-worship-f-to-m': ['foot-receive', 'body-fetishes'],
  'body-worship-m-to-f': ['romantic', 'body-fetishes'],
  'body-worship-f-to-m': ['romantic', 'body-fetishes'],
  'cock-worship': ['oral-preference', 'body-fetishes'],
  'pussy-worship': ['oral-preference', 'body-fetishes'],
  'armpit': ['body-fetishes'],
  'lactation': ['body-fetishes'],

  // CHASTITY
  'chastity-m-locked': ['power-sub'],
  'chastity-f-locked': ['power-sub'],

  // EMOTIONAL-CONTEXT
  'emotional-sex': ['romantic'],
  'first-time-together': ['romantic'],
  'makeup-sex': ['romantic', 'rough'],
  'angry-sex': ['rough-give', 'rough-receive'],
  'cheating-fantasy': ['fantasy-reality'],

  // SENSORY
  'blindfold': ['sensory', 'bondage'],
  'ice-play': ['sensory'],
  'feather-tickle': ['sensory'],
  'electrostim': ['sensory', 'toys'],

  // MANUAL
  'handjob': ['manual', 'foreplay'],
  'fingering': ['manual', 'foreplay'],
  'titfuck': ['manual'],

  // MASSAGE
  'massage-m-to-f': ['romantic', 'foreplay'],
  'massage-f-to-m': ['romantic', 'foreplay'],

  // SOLO-MUTUAL
  'joi': ['dirty-talk-give', 'power-dom'],
  'mutual-masturbation': ['exhibitionism'],

  // ROMANTIC
  'romantic-sex': ['romantic'],
  'aftercare': ['romantic', 'rough'],
  'quickie': ['spontaneous'],

  // INTIMACY-OUTSIDE
  'casual-touch': ['romantic'],
  'morning-teasing': ['romantic', 'foreplay'],
  'kitchen-counter': ['spontaneous', 'public'],
  'secret-touch': ['exhibitionism', 'public'],
  'sexting': ['recording', 'exhibitionism'],
  'video-sex': ['recording', 'exhibitionism'],
  'voice-instructions': ['dirty-talk-give', 'power-dom'],
  'filming': ['recording', 'exhibitionism'],

  // LOCATIONS
  'location-bedroom': ['public', 'spontaneous'],
  'location-shower': ['public', 'spontaneous'],
  'location-kitchen': ['public', 'spontaneous'],
  'location-car': ['public', 'spontaneous'],
  'location-nature': ['public', 'spontaneous'],
  'location-hotel': ['public', 'spontaneous'],
  'locations': ['public', 'spontaneous'],

  // LINGERIE-STYLES
  'lingerie-lace': ['lingerie'],
  'lingerie-fishnet': ['lingerie'],
  'lingerie-sheer': ['lingerie'],
  'lingerie-satin': ['lingerie'],
  'lingerie-corset': ['lingerie'],

  // POSITIONS
  'position-missionary': ['positions'],
  'position-doggy': ['positions'],
  'position-cowgirl': ['positions'],
  'position-reverse-cowgirl': ['positions'],
  'position-69': ['positions', 'oral-preference'],
  'position-spooning': ['positions'],
  'position-standing': ['positions'],
  'position-sitting': ['positions'],
  'positions': ['positions'],

  // BONDAGE-TYPES
  'bondage-restraint': ['bondage-give', 'bondage-receive'],
  'bondage-shibari': ['bondage-give', 'bondage-receive'],
  'bondage-st-andrews-cross': ['bondage-give', 'bondage-receive'],
  'bondage-spreader-bar': ['bondage-give', 'bondage-receive'],
  'bondage-suspension': ['bondage-give', 'bondage-receive'],
  'bondage-chains': ['bondage-give', 'bondage-receive'],

  // EXTREME (reassigned to proper categories)
  'objectification-f': ['power-dom'],
  'objectification-m': ['power-sub'],
  'mummification-f': ['bondage-receive'],
  'mummification-m': ['bondage-receive'],

  // BODY-WRITING
  'body-writing-m-to-f': ['degradation-give', 'power-dom'],
  'body-writing-f-to-m': ['degradation-receive', 'power-sub'],
  'body-writing-he-writes-on-her': ['degradation-give', 'power-dom'],
  'body-writing-she-writes-on-him': ['degradation-receive', 'power-sub'],
  'body-writing-words': ['degradation-give', 'degradation-receive'],

  // Alternative naming convention mappings (she/he instead of f/m)
  'golden-shower-she-on-him': ['watersports'],
  'golden-shower-he-on-her': ['watersports'],
  'spitting-she-on-him': ['degradation-receive', 'power-sub'],
  'spitting-he-on-her': ['degradation-give', 'power-dom'],
  'chastity-she-locked': ['power-sub'],
  'chastity-he-locked': ['power-sub'],
  'female-harness': ['lingerie'],
  'male-harness': ['lingerie'],
  'female-lingerie': ['lingerie'],
  'male-lingerie': ['lingerie'],
  'stockings-garters': ['lingerie'],
  'female-uniforms': ['lingerie', 'roleplay'],
  'male-uniforms': ['lingerie', 'roleplay'],
  'cnc-she-takes-him': ['rough-receive', 'power-sub'],
  'cnc-he-takes-her': ['rough-give', 'power-dom'],
  'bondage-she-ties-him': ['power-sub', 'bondage-receive'],
  'bondage-he-ties-her': ['power-dom', 'bondage-give'],
  'collar-she-owns-him': ['power-sub'],
  'collar-he-owns-her': ['power-dom'],
  'edging-she-controls-him': ['power-sub', 'orgasm-control'],
  'edging-he-controls-her': ['power-dom', 'orgasm-control'],
  'forced-orgasm-on-him': ['power-sub'],
  'forced-orgasm-on-her': ['power-dom'],
  'choking-she-chokes-him': ['rough-receive'],
  'choking-he-chokes-her': ['rough-give'],
  'face-slapping-she-slaps-him': ['rough-receive'],
  'face-slapping-he-slaps-her': ['rough-give', 'degradation'],
  'nipple-play-she-on-him': ['pain-tolerance'],
  'nipple-play-he-on-her': ['pain-tolerance'],
  'spanking-she-spanks-him': ['rough-receive', 'pain-tolerance'],
  'spanking-he-spanks-her': ['rough-give', 'pain-tolerance'],
  'wax-play-she-on-him': ['pain-tolerance', 'sensory'],
  'wax-play-he-on-her': ['pain-tolerance', 'sensory'],
  'massage-she-massages-him': ['romantic', 'foreplay'],
  'massage-he-massages-her': ['romantic', 'foreplay'],
  'facesitting-she-on-him': ['oral-preference', 'power-dom'],
  'facesitting-he-on-her': ['oral-preference', 'power-dom'],
  'rimming-she-to-him': ['oral-preference', 'anal-interest'],
  'rimming-he-to-her': ['oral-preference', 'anal-interest'],
  'pet-play-she-is-pet': ['roleplay', 'power-dom'],
  'pet-play-he-is-pet': ['roleplay', 'power-sub'],
  'body-worship-she-worships-him': ['romantic', 'body-fetishes'],
  'body-worship-he-worships-her': ['romantic', 'body-fetishes'],
  'foot-worship-she-worships-his': ['foot-receive', 'body-fetishes'],
  'foot-worship-he-worships-her': ['foot-give', 'body-fetishes'],
  'degradation-she-degrades-him': ['dirty-talk-receive', 'power-sub'],
  'degradation-he-degrades-her': ['dirty-talk-give', 'power-dom'],
  'praise-she-praises-him': ['praise-receive', 'verbal-preference'],
  'praise-he-praises-her': ['praise-give', 'verbal-preference'],
  'female-striptease': ['exhibitionism'],
  'male-striptease': ['exhibitionism'],
  'swinging-partner-swap': ['group'],
  'daddy-dom-little-girl': ['roleplay', 'power-dom'],
  'mommy-dom-little-boy': ['roleplay', 'power-sub'],
  'glory-hole-blowjob': ['exhibitionism', 'oral-receive', 'public'],
  'stranger-roleplay': ['roleplay'],
  'sex-locations': ['public', 'spontaneous'],
  'sex-positions': ['positions'],
  'dildo-play': ['toys-interest'],
  'vibrator-play': ['toys-interest'],
  'casual-intimate-touch': ['romantic'],
  'ice-play': ['sensory'],
  'moaning-and-screaming': ['verbal-preference'],
  'butt-plug-she-wears': ['toys-interest', 'anal-interest'],
  'butt-plug-he-wears': ['toys-interest', 'anal-interest'],

  // Inactive mutual scenes (for completeness)
  'golden-shower': ['watersports'],
  'spitting': ['degradation-give', 'power-dom'],
  'somnophilia': ['power-dom', 'free-use'],
  'ruined-orgasm': ['power-dom', 'power-sub'],
  'hotwife-vixen': ['group', 'power-dom'],
  'breath-play': ['rough-give'],
  'fisting': ['anal-give', 'anal-receive'],
  'knife-play': ['rough-give', 'power-dom'],
  'nipple-play': ['pain-tolerance'],
  'remote-control-toy': ['toys-interest', 'public'],
};

// Missing paired_scene references that need to be added
const MISSING_PAIRED_SCENES: Record<string, string> = {
  'breath-play-m-to-f': 'breath-play-f-to-m',
  'breath-play-f-to-m': 'breath-play-m-to-f',
  'glory-hole-f-gives': 'glory-hole-m-gives',
  'glory-hole-m-gives': 'glory-hole-f-gives',
  'knife-play-m-to-f': 'knife-play-f-to-m',
  'knife-play-f-to-m': 'knife-play-m-to-f',
  'ruined-orgasm-m-to-f': 'ruined-orgasm-f-to-m',
  'ruined-orgasm-f-to-m': 'ruined-orgasm-m-to-f',
  'somnophilia-m-to-f': 'somnophilia-f-to-m',
  'somnophilia-f-to-m': 'somnophilia-m-to-f',
  'whipping-m-to-f': 'whipping-f-to-m',
  'whipping-f-to-m': 'whipping-m-to-f',
};

// Baseline scenes should NOT have scene_type: 'clarification'
const BASELINE_SLUGS = [
  'anal-interest',
  'body-fetishes',
  'clothing-preference',
  'fantasy-reality',
  'group-interest',
  'intensity',
  'openness',
  'oral-preference',
  'pain-tolerance',
  'power-dynamic',
  'roleplay-interest',
  'toys-interest',
  'verbal-preference',
  'watching-showing',
];

interface SceneFile {
  slug: string;
  scene_type?: string;
  clarification_for?: string[];
  paired_scene?: string;
  elements?: unknown[];
  [key: string]: unknown;
}

interface ProcessResult {
  updated: number;
  skipped: number;
  errors: string[];
  details: {
    addedSceneType: number;
    addedClarificationFor: number;
    fixedPairedScene: number;
    addedPairedScene: number;
    removedElements: number;
    noMappingFound: string[];
  };
}

function fixPairedSceneReference(pairedScene: string | undefined): string | undefined {
  if (!pairedScene) return undefined;
  // Convert underscore to hyphen
  return pairedScene.replace(/_/g, '-');
}

function processDirectory(dir: string): ProcessResult {
  const result: ProcessResult = {
    updated: 0,
    skipped: 0,
    errors: [],
    details: {
      addedSceneType: 0,
      addedClarificationFor: 0,
      fixedPairedScene: 0,
      addedPairedScene: 0,
      removedElements: 0,
      noMappingFound: [],
    },
  };

  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return result;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subResult = processDirectory(fullPath);
      result.updated += subResult.updated;
      result.skipped += subResult.skipped;
      result.errors.push(...subResult.errors);
      result.details.addedSceneType += subResult.details.addedSceneType;
      result.details.addedClarificationFor += subResult.details.addedClarificationFor;
      result.details.fixedPairedScene += subResult.details.fixedPairedScene;
      result.details.addedPairedScene += subResult.details.addedPairedScene;
      result.details.removedElements += subResult.details.removedElements;
      result.details.noMappingFound.push(...subResult.details.noMappingFound);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const scene: SceneFile = JSON.parse(content);
        const slug = scene.slug;

        if (!slug) {
          result.errors.push(`No slug in ${fullPath}`);
          continue;
        }

        let modified = false;

        // Skip baseline scenes - they are main_question, not clarification
        const isBaseline = BASELINE_SLUGS.includes(slug);

        // 1. Add scene_type: 'clarification' (skip baseline)
        if (!isBaseline && scene.scene_type !== 'clarification') {
          scene.scene_type = 'clarification';
          result.details.addedSceneType++;
          modified = true;
        }

        // 2. Add clarification_for from mapping (skip baseline)
        if (!isBaseline) {
          const mapping = CLARIFICATION_MAPPING[slug];
          if (mapping) {
            if (JSON.stringify(scene.clarification_for) !== JSON.stringify(mapping)) {
              scene.clarification_for = mapping;
              result.details.addedClarificationFor++;
              modified = true;
            }
          } else {
            // Try to find a partial match for directional scenes
            const baseSlug = slug.replace(/-m-to-f|-f-to-m|-give|-receive$/, '');
            const baseMapping = CLARIFICATION_MAPPING[baseSlug];
            if (baseMapping) {
              if (JSON.stringify(scene.clarification_for) !== JSON.stringify(baseMapping)) {
                scene.clarification_for = baseMapping;
                result.details.addedClarificationFor++;
                modified = true;
              }
            } else if (!scene.clarification_for) {
              result.details.noMappingFound.push(slug);
            }
          }
        }

        // 3. Fix paired_scene reference (underscore → hyphen)
        if (scene.paired_scene) {
          const fixed = fixPairedSceneReference(scene.paired_scene);
          if (fixed && fixed !== scene.paired_scene) {
            scene.paired_scene = fixed;
            result.details.fixedPairedScene++;
            modified = true;
          }
        }

        // 4. Add missing paired_scene
        if (!scene.paired_scene && MISSING_PAIRED_SCENES[slug]) {
          scene.paired_scene = MISSING_PAIRED_SCENES[slug];
          result.details.addedPairedScene++;
          modified = true;
        }

        // 5. Remove deprecated elements[]
        if (scene.elements && Array.isArray(scene.elements)) {
          delete scene.elements;
          result.details.removedElements++;
          modified = true;
        }

        if (modified) {
          // Reorder keys for cleaner output
          const orderedScene = reorderKeys(scene);
          fs.writeFileSync(fullPath, JSON.stringify(orderedScene, null, 2) + '\n');
          console.log(`Updated: ${slug}`);
          result.updated++;
        } else {
          result.skipped++;
        }
      } catch (e) {
        const errorMsg = `Error processing ${fullPath}: ${e}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  }

  return result;
}

function reorderKeys(scene: SceneFile): SceneFile {
  // Define preferred key order
  const keyOrder = [
    'id',
    'slug',
    'version',
    'scene_type',
    'clarification_for',
    'is_active',
    'is_onboarding',
    'onboarding_order',
    'for_gender',
    'paired_scene',
    'role_direction',
    'title',
    'subtitle',
    'user_description',
    'ai_description',
    'image_prompt',
    'image_url',
    'intensity',
    'category',
    'tags',
    'ai_context',
    'question',
  ];

  const ordered: Record<string, unknown> = {};

  // Add keys in preferred order
  for (const key of keyOrder) {
    if (key in scene) {
      ordered[key] = scene[key];
    }
  }

  // Add remaining keys
  for (const key of Object.keys(scene)) {
    if (!(key in ordered)) {
      ordered[key] = scene[key];
    }
  }

  return ordered as SceneFile;
}

async function main() {
  console.log('='.repeat(60));
  console.log('V3 Migration: Adding clarification_for to composite scenes');
  console.log('='.repeat(60));
  console.log(`\nScanning: ${SCENES_DIR}\n`);

  const result = processDirectory(SCENES_DIR);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Updated files:     ${result.updated}`);
  console.log(`Skipped (no change): ${result.skipped}`);
  console.log(`Errors:            ${result.errors.length}`);
  console.log('\nDetails:');
  console.log(`  - Added scene_type:      ${result.details.addedSceneType}`);
  console.log(`  - Added clarification_for: ${result.details.addedClarificationFor}`);
  console.log(`  - Fixed paired_scene:    ${result.details.fixedPairedScene}`);
  console.log(`  - Added paired_scene:    ${result.details.addedPairedScene}`);
  console.log(`  - Removed elements[]:    ${result.details.removedElements}`);

  if (result.details.noMappingFound.length > 0) {
    console.log(`\n⚠️  No mapping found for ${result.details.noMappingFound.length} scenes:`);
    for (const slug of result.details.noMappingFound.slice(0, 20)) {
      console.log(`    - ${slug}`);
    }
    if (result.details.noMappingFound.length > 20) {
      console.log(`    ... and ${result.details.noMappingFound.length - 20} more`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration complete!');
  console.log('Next step: npx tsx supabase/seed-v2-data.ts');
  console.log('='.repeat(60));
}

main().catch(console.error);

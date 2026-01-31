/**
 * Clean up clarification_for — remove mass assignments, keep only contextual relationships
 *
 * Logic: clarification_for means "show this scene AFTER user said YES to [parent]"
 * It's about contextual continuation, not category membership.
 *
 * Examples of GOOD clarification_for:
 * - deepthroat → ["blowjob"] (логично после минета)
 * - collar → ["bondage-he-ties-her", "lingerie-lace"] (два контекста: власть и одежда)
 * - butt-plug → ["anal-play-on-her", "vibrator-play"] (анал или игрушки)
 *
 * Examples of BAD (independent scenes, no clarification_for needed):
 * - knife-play — independent extreme scene
 * - golden-shower — independent fetish
 * - breath-play — independent extreme
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

// Scenes that ARE contextual clarifications (keep clarification_for)
// Format: scene_slug → [parent_slugs]
const CONTEXTUAL_CLARIFICATIONS: Record<string, string[]> = {
  // ORAL clarifications
  'deepthroat': ['blowjob'],
  'facefuck': ['blowjob'],
  'facefuck-receive': ['blowjob-receive'],
  'finger-sucking': ['blowjob', 'cunnilingus'],

  // ANAL clarifications
  'butt-plug': ['anal-play-on-her', 'anal-play-on-him', 'vibrator-play'],
  'anal-hook': ['anal-play-on-her', 'anal-play-on-him', 'bondage-he-ties-her'],
  'toy-beads': ['anal-play-on-her', 'anal-play-on-him'],
  'toy-plug-small': ['anal-play-on-her', 'anal-play-on-him'],
  'toy-plug-large': ['anal-play-on-her', 'anal-play-on-him'],
  'rimming-m-to-f': ['anal-play-on-her', 'cunnilingus'],
  'rimming-m-to-f-receive': ['anal-play-on-her-receive', 'cunnilingus-receive'],
  'rimming-f-to-m': ['anal-play-on-him', 'blowjob'],
  'rimming-f-to-m-receive': ['anal-play-on-him-receive', 'blowjob-receive'],
  'figging-m-to-f': ['anal-play-on-her', 'spanking-he-spanks-her'],
  'figging-m-to-f-receive': ['anal-play-on-her-receive', 'spanking-m-to-f-receive'],
  'figging-f-to-m': ['anal-play-on-him', 'spanking-she-spanks-him'],
  'figging-f-to-m-receive': ['anal-play-on-him-receive', 'spanking-f-to-m-receive'],

  // BONDAGE clarifications
  'collar-he-owns-her': ['bondage-he-ties-her', 'lingerie-lace'],
  'collar-he-owns-her-receive': ['bondage-he-ties-her-receive', 'lingerie-lace'],
  'collar-she-owns-him': ['bondage-she-ties-him', 'lingerie-lace'],
  'collar-she-owns-him-receive': ['bondage-she-ties-him-receive', 'lingerie-lace'],
  'bondage-shibari': ['bondage-he-ties-her', 'bondage-she-ties-him'],
  'bondage-restraint': ['bondage-he-ties-her', 'bondage-she-ties-him'],
  'bondage-spreader-bar': ['bondage-he-ties-her', 'bondage-she-ties-him'],
  'bondage-chains': ['bondage-he-ties-her', 'bondage-she-ties-him'],
  'blindfold': ['bondage-he-ties-her', 'bondage-she-ties-him'],

  // TOYS clarifications
  'remote-control': ['vibrator-play', 'public-sex'],
  'toy-wand': ['vibrator-play'],
  'toy-clitoral': ['vibrator-play'],
  'nipple-clamps': ['nipple-play-he-on-her', 'nipple-play-she-on-him', 'spanking-he-spanks-her'],

  // CONTROL clarifications (after bondage)
  'edging-he-controls-her': ['bondage-he-ties-her'],
  'edging-he-controls-her-receive': ['bondage-he-ties-her-receive'],
  'edging-she-controls-him': ['bondage-she-ties-him'],
  'edging-she-controls-him-receive': ['bondage-she-ties-him-receive'],
  'forced-orgasm-on-her': ['bondage-he-ties-her', 'vibrator-play'],
  'forced-orgasm-on-her-receive': ['bondage-he-ties-her-receive', 'vibrator-play'],
  'forced-orgasm-on-him': ['bondage-she-ties-him'],
  'forced-orgasm-on-him-receive': ['bondage-she-ties-him-receive'],
  'orgasm-control': ['bondage-he-ties-her', 'bondage-she-ties-him'],
  'ruined-orgasm-m-to-f': ['edging-he-controls-her', 'bondage-he-ties-her'],
  'ruined-orgasm-m-to-f-receive': ['edging-he-controls-her-receive', 'bondage-he-ties-her-receive'],
  'ruined-orgasm-f-to-m': ['edging-she-controls-him', 'bondage-she-ties-him'],
  'ruined-orgasm-f-to-m-receive': ['edging-she-controls-him-receive', 'bondage-she-ties-him-receive'],
  'free-use-f-available': ['bondage-he-ties-her'],
  'free-use-f-available-receive': ['bondage-he-ties-her-receive'],
  'free-use-m-available': ['bondage-she-ties-him'],
  'free-use-m-available-receive': ['bondage-she-ties-him-receive'],
  'sex-tasks': ['bondage-he-ties-her', 'bondage-she-ties-him', 'dirty-talk'],

  // IMPACT clarifications (after spanking)
  'choking-he-chokes-her': ['spanking-he-spanks-her'],
  'choking-m-to-f-receive': ['spanking-m-to-f-receive'],
  'choking-she-chokes-him': ['spanking-she-spanks-him'],
  'choking-f-to-m-receive': ['spanking-f-to-m-receive'],
  'face-slapping-he-slaps-her': ['spanking-he-spanks-her', 'dirty-talk'],
  'face-slapping-m-to-f-receive': ['spanking-m-to-f-receive', 'dirty-talk'],
  'face-slapping-she-slaps-him': ['spanking-she-spanks-him'],
  'face-slapping-f-to-m-receive': ['spanking-f-to-m-receive'],
  'whipping-m-to-f': ['spanking-he-spanks-her'],
  'whipping-m-to-f-receive': ['spanking-m-to-f-receive'],
  'whipping-f-to-m': ['spanking-she-spanks-him'],
  'whipping-f-to-m-receive': ['spanking-f-to-m-receive'],

  // VERBAL clarifications
  'degradation-m-to-f': ['dirty-talk', 'spanking-he-spanks-her'],
  'degradation-m-to-f-receive': ['dirty-talk', 'spanking-m-to-f-receive'],
  'degradation-f-to-m': ['dirty-talk', 'spanking-she-spanks-him'],
  'degradation-f-to-m-receive': ['dirty-talk', 'spanking-f-to-m-receive'],
  'moaning-and-screaming': ['dirty-talk'],

  // CLOTHING clarifications (after lingerie)
  'stockings': ['lingerie-lace'],
  'heels-only': ['lingerie-lace'],
  'harness-f': ['lingerie-lace', 'bondage-he-ties-her'],
  'harness-m': ['lingerie-lace', 'bondage-she-ties-him'],
  'latex-leather': ['lingerie-lace'],
  'torn-clothes': ['spanking-he-spanks-her', 'spanking-she-spanks-him'],

  // ROLEPLAY clarifications (after stranger-roleplay or boss scene)
  'service-roleplay': ['stranger-roleplay', 'bondage-he-ties-her'],
  'taboo-roleplay': ['stranger-roleplay'],
  'truth-or-dare': ['stranger-roleplay', 'dirty-talk'],
  'uniforms-f': ['boss-m-secretary-f', 'lingerie-lace'],
  'uniforms-f-receive': ['boss-m-secretary-f-receive', 'lingerie-lace'],
  'uniforms-m': ['boss-f-subordinate-m', 'lingerie-lace'],
  'uniforms-m-receive': ['boss-f-subordinate-m-receive', 'lingerie-lace'],

  // EXHIBITIONISM clarifications
  'voyeurism': ['public-sex'],
  'striptease-f': ['public-sex', 'lingerie-lace'],
  'striptease-m': ['public-sex'],
  'no-panties-walk': ['public-sex', 'lingerie-lace'],
  'dress-code': ['public-sex', 'lingerie-lace'],
  'sexting': ['filming', 'dirty-talk'],
  'video-sex': ['filming'],
  'voice-instructions': ['filming', 'dirty-talk'],

  // GROUP clarifications
  'gangbang': ['threesome-mfm'],
  'orgy': ['threesome-fmf', 'threesome-mfm'],
  'swinging': ['threesome-fmf', 'threesome-mfm'],
  'double-penetration': ['threesome-mfm', 'anal-play-on-her'],
  'cuckold': ['threesome-mfm'],
  'hotwife': ['threesome-mfm', 'threesome-fmf'],

  // CNC clarifications (after rough scenes)
  'cnc-he-takes-her': ['spanking-he-spanks-her', 'bondage-he-ties-her'],
  'cnc-he-takes-her-receive': ['spanking-m-to-f-receive', 'bondage-he-ties-her-receive'],
  'cnc-she-takes-him': ['spanking-she-spanks-him', 'bondage-she-ties-him'],
  'cnc-she-takes-him-receive': ['spanking-f-to-m-receive', 'bondage-she-ties-him-receive'],
  'primal': ['spanking-he-spanks-her', 'spanking-she-spanks-him'],
  'somnophilia-m-to-f': ['free-use-f-available', 'bondage-he-ties-her'],
  'somnophilia-m-to-f-receive': ['free-use-f-available-receive', 'bondage-he-ties-her-receive'],
  'somnophilia-f-to-m': ['free-use-m-available', 'bondage-she-ties-him'],
  'somnophilia-f-to-m-receive': ['free-use-m-available-receive', 'bondage-she-ties-him-receive'],

  // WORSHIP clarifications
  'foot-worship-m-to-f': ['lingerie-lace', 'heels-only'],
  'foot-worship-m-to-f-receive': ['lingerie-lace', 'heels-only'],
  'foot-worship-f-to-m': ['bondage-she-ties-him'],
  'foot-worship-f-to-m-receive': ['bondage-she-ties-him-receive'],
  'body-worship-m-to-f': ['massage-m-to-f'],
  'body-worship-m-to-f-receive': ['massage-m-to-f-receive'],
  'body-worship-f-to-m': ['massage-f-to-m'],
  'body-worship-f-to-m-receive': ['massage-f-to-m-receive'],
  'cock-worship': ['blowjob'],
  'pussy-worship': ['cunnilingus'],

  // CHASTITY clarifications
  'chastity-m-locked': ['bondage-she-ties-him', 'edging-she-controls-him'],
  'chastity-m-locked-receive': ['bondage-she-ties-him-receive', 'edging-she-controls-him-receive'],
  'chastity-f-locked': ['bondage-he-ties-her', 'edging-he-controls-her'],
  'chastity-f-locked-receive': ['bondage-he-ties-her-receive', 'edging-he-controls-her-receive'],

  // FLUIDS clarifications
  'squirting': ['cunnilingus', 'vibrator-play'],
  'squirt-receiving': ['cunnilingus', 'vibrator-play'],
  'breeding-kink': ['dirty-talk'],
  'breeding-kink-f': ['dirty-talk'],
  'breeding-kink-m': ['dirty-talk'],

  // PET PLAY clarifications
  'pet-play-f-is-pet': ['collar-he-owns-her', 'bondage-he-ties-her'],
  'pet-play-f-is-pet-receive': ['collar-he-owns-her-receive', 'bondage-he-ties-her-receive'],
  'pet-play-m-is-pet': ['collar-she-owns-him', 'bondage-she-ties-him'],
  'pet-play-m-is-pet-receive': ['collar-she-owns-him-receive', 'bondage-she-ties-him-receive'],

  // AGE PLAY clarifications
  'ddlg-daddy': ['bondage-he-ties-her', 'praise-he-praises-her'],
  'ddlg-daddy-receive': ['bondage-he-ties-her-receive', 'praise-m-to-f-receive'],
  'ddlg-little-girl': ['bondage-he-ties-her', 'praise-he-praises-her'],
  'ddlg-little-girl-receive': ['bondage-he-ties-her-receive', 'praise-m-to-f-receive'],
  'mdlb-mommy': ['bondage-she-ties-him', 'praise-she-praises-him'],
  'mdlb-mommy-receive': ['bondage-she-ties-him-receive', 'praise-f-to-m-receive'],
  'mdlb-little-boy': ['bondage-she-ties-him', 'praise-she-praises-him'],
  'mdlb-little-boy-receive': ['bondage-she-ties-him-receive', 'praise-f-to-m-receive'],

  // EXTREME clarifications (only those with clear parent)
  'mummification-f': ['bondage-he-ties-her'],
  'mummification-f-receive': ['bondage-he-ties-her-receive'],
  'mummification-m': ['bondage-she-ties-him'],
  'mummification-m-receive': ['bondage-she-ties-him-receive'],
  'objectification-f': ['bondage-he-ties-her', 'free-use-f-available'],
  'objectification-f-receive': ['bondage-he-ties-her-receive', 'free-use-f-available-receive'],
  'objectification-m': ['bondage-she-ties-him', 'free-use-m-available'],
  'objectification-m-receive': ['bondage-she-ties-him-receive', 'free-use-m-available-receive'],
  'feminization-do': ['bondage-she-ties-him', 'lingerie-lace'],
  'feminization-wear': ['bondage-she-ties-him-receive', 'lingerie-lace'],

  // PEGGING (after anal on him)
  'pegging': ['anal-play-on-him', 'bondage-she-ties-him'],
  'pegging-receive': ['anal-play-on-him-receive', 'bondage-she-ties-him-receive'],

  // FISTING (after anal)
  'fisting-anal-m-to-f': ['anal-play-on-her'],
  'fisting-anal-m-to-f-receive': ['anal-play-on-her-receive'],
  'fisting-anal-f-to-m': ['anal-play-on-him'],
  'fisting-anal-f-to-m-receive': ['anal-play-on-him-receive'],
  'fisting-vaginal-m-to-f': ['vibrator-play'],
  'fisting-vaginal-m-to-f-receive': ['vibrator-play'],
};

// All other scenes are INDEPENDENT — no clarification_for needed
// Examples: knife-play, golden-shower, breath-play, needle-play, etc.

function getAllJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  function scanDir(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory() && !item.name.startsWith('_')) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.json') && item.name !== '_index.json') {
        files.push(fullPath);
      }
    }
  }
  scanDir(dir);
  return files;
}

let updated = 0;
let cleared = 0;
let kept = 0;
const changes: string[] = [];

const files = getAllJsonFiles(COMPOSITE_DIR);
for (const filePath of files) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);
    const slug = scene.slug;

    if (!slug) continue;

    const oldClarificationFor = scene.clarification_for || [];
    const newClarificationFor = CONTEXTUAL_CLARIFICATIONS[slug];

    if (newClarificationFor !== undefined) {
      // This scene has contextual clarification_for
      if (JSON.stringify(oldClarificationFor) !== JSON.stringify(newClarificationFor)) {
        scene.clarification_for = newClarificationFor;
        fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
        changes.push(`[UPDATED] ${slug}: [${oldClarificationFor.join(', ')}] → [${newClarificationFor.join(', ')}]`);
        updated++;
      } else {
        kept++;
      }
    } else if (oldClarificationFor.length > 0) {
      // Independent scene — remove clarification_for
      delete scene.clarification_for;
      fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
      changes.push(`[CLEARED] ${slug}: [${oldClarificationFor.join(', ')}] → (independent)`);
      cleared++;
    }
  } catch (e) {
    console.error(`Failed to process ${filePath}:`, e);
  }
}

// Output results
for (const c of changes.sort()) {
  console.log(c);
}

console.log('\n=== SUMMARY ===');
console.log(`Updated with new clarification_for: ${updated}`);
console.log(`Cleared (now independent): ${cleared}`);
console.log(`Kept unchanged: ${kept}`);
console.log(`Total contextual clarifications defined: ${Object.keys(CONTEXTUAL_CLARIFICATIONS).length}`);

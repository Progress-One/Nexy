/**
 * Fix clarification_for in JSON files
 *
 * ⚠️ DEPRECATED APPROACH!
 * This script used CATEGORY_TO_BASE_SCENES mapping which is INCORRECT.
 * clarification_for should be set based on CONTEXTUAL continuation,
 * NOT by category folder membership.
 *
 * Example: anal-hook should clarify ["toys-interest", "anal-play-on-her"]
 * because it's relevant after BOTH "toys?" and "anal play?" questions.
 *
 * See docs/scene-guide-for-humans.md for correct approach.
 *
 * This script only fixes gate names → scene slugs conversion.
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

// Mapping: category folder → base scene slugs that are "parents"
const CATEGORY_TO_BASE_SCENES: Record<string, string[]> = {
  // Anal
  'anal': ['anal-interest', 'anal-play-on-her', 'anal-play-on-him'],

  // Oral
  'oral': ['oral-preference', 'blowjob', 'cunnilingus'],

  // Impact/Pain
  'impact-pain': ['pain-tolerance', 'pain-tolerance-m', 'pain-tolerance-f', 'intensity'],

  // Control/Power
  'control-power': ['power-dynamic', 'power-dynamic-m', 'power-dynamic-f'],

  // Bondage
  'bondage-types': ['power-dynamic', 'power-dynamic-m', 'power-dynamic-f'],

  // Verbal
  'verbal': ['dirty-talk-interest', 'praise-interest', 'verbal-preference'],

  // Toys
  'toys': ['toys-interest'],

  // Roleplay
  'roleplay': ['roleplay-interest'],
  'age-play': ['roleplay-interest'],
  'pet-play': ['roleplay-interest', 'power-dynamic'],

  // Exhibitionism
  'exhibitionism': ['exhibitionism', 'voyeurism', 'watching-showing'],

  // Body fluids
  'body-fluids': ['oral-preference', 'body-fetishes'],

  // Group
  'group': ['group-interest'],
  'cuckold': ['group-interest'],

  // Romantic
  'romantic': ['openness'],
  'emotional-context': ['openness'],

  // Sensory
  'sensory': ['pain-tolerance', 'intensity'],

  // Clothing/Lingerie
  'clothing': ['clothing-preference', 'clothing-preference-m', 'clothing-preference-f'],
  'lingerie-styles': ['clothing-preference', 'clothing-preference-f'],

  // Positions/Locations
  'positions': [],  // No base scene, always show
  'locations': [],

  // CNC/Rough
  'cnc-rough': ['intensity', 'power-dynamic'],

  // Extreme
  'extreme': ['intensity', 'pain-tolerance', 'power-dynamic'],

  // Chastity
  'chastity': ['power-dynamic', 'toys-interest'],

  // Worship
  'worship-service': ['body-fetishes', 'power-dynamic'],

  // Manual
  'manual': ['oral-preference'],
  'massage': [],

  // Filming
  'filming': ['exhibitionism', 'voyeurism'],

  // Solo/Mutual
  'solo-mutual': ['exhibitionism'],

  // Furniture
  'furniture': ['toys-interest'],

  // Intimacy outside
  'intimacy-outside': ['exhibitionism', 'openness'],

  // Symmetric (both do same thing)
  'symmetric': [],
};

// Old gate names to new scene slugs
const GATE_TO_SLUG: Record<string, string> = {
  'oral': 'oral-preference',
  'anal': 'anal-interest',
  'rough': 'intensity',
  'power_dynamic': 'power-dynamic',
  'bondage': 'power-dynamic',
  'dirty_talk': 'dirty-talk-interest',
  'praise': 'praise-interest',
  'roleplay': 'roleplay-interest',
  'toys': 'toys-interest',
  'group': 'group-interest',
  'exhibitionism': 'exhibitionism',
  'voyeurism': 'voyeurism',
  'romantic': 'openness',
  'lingerie': 'clothing-preference',
  'foot': 'body-fetishes',
  'body_fluids': 'body-fetishes',
  'public': 'exhibitionism',
  'recording': 'exhibitionism',
  'extreme': 'intensity',
  'quickie': 'openness',
  'sexting': 'exhibitionism',
};

function getAllJsonFiles(dir: string): string[] {
  const files: string[] = [];
  function scanDir(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.json') && item.name !== '_index.json') {
        files.push(fullPath);
      }
    }
  }
  scanDir(dir);
  return files;
}

let fixed = 0;
let skipped = 0;
let errors: string[] = [];

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(COMPOSITE_DIR, filePath);
  const category = relPath.split(path.sep)[0];

  try {
    const scene = JSON.parse(content);

    // Skip if not a clarification
    if (scene.scene_type !== 'clarification') {
      skipped++;
      continue;
    }

    // Get current clarification_for
    const currentClarFor = scene.clarification_for || [];
    if (currentClarFor.length === 0) {
      // No clarification_for - add based on category
      const baseScenes = CATEGORY_TO_BASE_SCENES[category] || [];
      if (baseScenes.length > 0) {
        scene.clarification_for = baseScenes;
        const updatedContent = JSON.stringify(scene, null, 2);
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        console.log(`✅ ${relPath}: added clarification_for: ${baseScenes.join(', ')}`);
        fixed++;
      } else {
        console.log(`⏭️ ${relPath}: no base scenes for category "${category}"`);
        skipped++;
      }
      continue;
    }

    // Check if using old gate names
    let needsUpdate = false;
    const newClarFor: string[] = [];

    for (const item of currentClarFor) {
      if (GATE_TO_SLUG[item]) {
        // Old gate name - convert to slug
        newClarFor.push(GATE_TO_SLUG[item]);
        needsUpdate = true;
      } else {
        // Already a slug or unknown
        newClarFor.push(item);
      }
    }

    if (needsUpdate) {
      scene.clarification_for = newClarFor;
      const updatedContent = JSON.stringify(scene, null, 2);
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ ${relPath}: ${currentClarFor.join(',')} → ${newClarFor.join(',')}`);
      fixed++;
    } else {
      skipped++;
    }

  } catch (e) {
    errors.push(`${relPath}: ${(e as Error).message}`);
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`⏭️ Skipped: ${skipped} files`);
if (errors.length > 0) {
  console.log(`\n❌ Errors:`);
  errors.forEach(e => console.log(`  ${e}`));
}

/**
 * Replace deprecated baseline slugs in clarification_for with actual scene slugs
 *
 * These are contextual replacements - the new slugs represent the same concept
 * but as concrete scenes instead of abstract questions.
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

// Mapping: deprecated slug -> replacement scene slugs
// These are contextual replacements based on what makes sense as a parent scene
const REPLACEMENT_MAP: Record<string, string[]> = {
  // Power/control concepts
  'power-dynamic': ['bondage-he-ties-her', 'bondage-she-ties-him'],
  'power-dynamic-m': ['bondage-he-ties-her'],
  'power-dynamic-f': ['bondage-she-ties-him'],

  // Intensity/rough concepts
  'intensity': ['spanking-he-spanks-her', 'spanking-she-spanks-him'],
  'pain-tolerance': ['spanking-he-spanks-her', 'spanking-she-spanks-him'],
  'pain-tolerance-m': ['spanking-she-spanks-him'],
  'pain-tolerance-f': ['spanking-he-spanks-her'],

  // Oral
  'oral-preference': ['blowjob', 'cunnilingus'],

  // Anal
  'anal-interest': ['anal-play-on-her', 'anal-play-on-him'],

  // Verbal
  'dirty-talk-interest': ['dirty-talk'],
  'verbal-preference': ['dirty-talk'],
  'praise-interest': ['praise-he-praises-her', 'praise-she-praises-him'],

  // Roleplay
  'roleplay-interest': ['stranger-roleplay'],

  // Toys
  'toys-interest': ['vibrator-play', 'cock-ring'],

  // Group
  'group-interest': ['threesome-fmf', 'threesome-mfm'],

  // Exhibitionism
  'exhibitionism': ['public-sex'],
  'watching-showing': ['public-sex'],
  'voyeurism': ['public-sex'],

  // Clothing
  'clothing-preference': ['lingerie-lace'],
  'clothing-preference-m': ['lingerie-lace'],
  'clothing-preference-f': ['lingerie-lace'],

  // Too abstract - remove entirely
  'openness': [],
  'body-fetishes': [],
  'fantasy-reality': [],
};

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
let removed = 0;
const replacements: string[] = [];

const files = getAllJsonFiles(COMPOSITE_DIR);
for (const filePath of files) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);

    if (!scene.clarification_for || scene.clarification_for.length === 0) continue;

    const original = [...scene.clarification_for];
    const newClarificationFor: string[] = [];
    let hasChanges = false;

    for (const slug of scene.clarification_for) {
      if (REPLACEMENT_MAP[slug] !== undefined) {
        hasChanges = true;
        const replacementSlugs = REPLACEMENT_MAP[slug];
        for (const r of replacementSlugs) {
          if (!newClarificationFor.includes(r)) {
            newClarificationFor.push(r);
          }
        }
      } else {
        if (!newClarificationFor.includes(slug)) {
          newClarificationFor.push(slug);
        }
      }
    }

    if (hasChanges) {
      if (newClarificationFor.length === 0) {
        delete scene.clarification_for;
        removed++;
        replacements.push(`[REMOVED] ${scene.slug}: [${original.join(', ')}] -> (empty)`);
      } else {
        scene.clarification_for = newClarificationFor;
        updated++;
        replacements.push(`[UPDATED] ${scene.slug}: [${original.join(', ')}] -> [${newClarificationFor.join(', ')}]`);
      }

      fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
    }
  } catch (e) {
    console.error(`Failed to process ${filePath}:`, e);
  }
}

// Output results
for (const r of replacements.sort()) {
  console.log(r);
}

console.log('\n=== SUMMARY ===');
console.log(`Updated: ${updated}`);
console.log(`Removed: ${removed}`);
console.log(`Total changes: ${updated + removed}`);

/**
 * Remove clarification_for from INDEPENDENT scenes
 *
 * These scenes are NOT contextual follow-ups to anything.
 * They are standalone topics that should appear based on gates only.
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

// Scenes that are INDEPENDENT - should NOT have clarification_for
const INDEPENDENT_SCENES = [
  // Body fluids - independent fetishes
  'breeding-kink',
  'breeding-kink-f',
  'breeding-kink-m',
  'golden-shower-m-to-f',
  'golden-shower-m-to-f-receive',
  'golden-shower-f-to-m',
  'golden-shower-f-to-m-receive',
  'spitting-m-to-f',
  'spitting-m-to-f-receive',
  'spitting-f-to-m',
  'spitting-f-to-m-receive',
  'lactation',

  // Extreme - independent edge play
  'breath-play-m-to-f',
  'breath-play-m-to-f-receive',
  'breath-play-f-to-m',
  'breath-play-f-to-m-receive',
  'knife-play-m-to-f',
  'knife-play-m-to-f-receive',
  'knife-play-f-to-m',
  'knife-play-f-to-m-receive',
  'needle-play-m-to-f',
  'needle-play-m-to-f-receive',
  'needle-play-f-to-m',
  'needle-play-f-to-m-receive',
  'electrostim',
  'fucking-machine',

  // Impact - some are independent
  'cbt',
  'wax-play',
  'wax-play-he-on-her',
  'wax-play-m-to-f-receive',
  'wax-play-she-on-him',
  'wax-play-f-to-m-receive',
  'nipple-play',
  'nipple-play-he-on-her',
  'nipple-play-m-to-f-receive',
  'nipple-play-she-on-him',
  'nipple-play-f-to-m-receive',

  // Locations - independent contexts
  'kitchen-counter',
  'location-bedroom',
  'location-car',
  'location-hotel',
  'location-kitchen',
  'location-nature',
  'location-shower',
  'sex-locations',

  // Emotional - independent contexts
  'aftercare',
  'angry-sex',
  'makeup-sex',
  'cheating-fantasy',
  'mutual-masturbation',

  // Exhibitionism base scenes
  'exhibitionism',
  'voyeurism',

  // Positions - independent
  'position-69',

  // These have wrong parents - should be independent or different
  'doctor-patient',
  'teacher-m-student-f',
  'teacher-m-student-f-receive',
  'teacher-f-student-m',
  'teacher-f-student-m-receive',
  'boss-f-subordinate-m',
  'boss-f-subordinate-m-receive',
];

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

let cleared = 0;
const changes: string[] = [];

const files = getAllJsonFiles(COMPOSITE_DIR);
for (const filePath of files) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);
    const slug = scene.slug;

    if (!slug) continue;

    if (INDEPENDENT_SCENES.includes(slug) && scene.clarification_for?.length > 0) {
      const old = scene.clarification_for;
      delete scene.clarification_for;
      fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
      changes.push(`[CLEARED] ${slug}: [${old.join(', ')}] → (independent)`);
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
console.log(`Cleared clarification_for: ${cleared}`);

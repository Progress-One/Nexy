/**
 * Fix clarification_for chains in scene JSON files
 *
 * This script:
 * 1. Removes incorrect parent references
 * 2. Adds missing parent references for proper sequencing
 *
 * clarification_for = "after which scene to show this one"
 * NOT about gates/visibility - purely about sequencing
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

interface ClarificationFix {
  remove?: string[];  // Parents to remove
  add?: string[];     // Parents to add
}

// Per-scene fixes
const CLARIFICATION_FIXES: Record<string, ClarificationFix> = {
  // ═══════════════════════════════════════════════════════════════
  // AGE PLAY: not about bondage, about praise + roleplay
  // ═══════════════════════════════════════════════════════════════
  'ddlg-daddy': { remove: ['bondage-he-ties-her', 'bondage'], add: ['praise-he-praises-her'] },
  'ddlg-little-girl': { remove: ['bondage-he-ties-her', 'bondage'], add: ['praise-m-to-f-receive'] },
  'mdlb-mommy': { remove: ['bondage-she-ties-him', 'bondage'], add: ['praise-she-praises-him'] },
  'mdlb-little-boy': { remove: ['bondage-she-ties-him', 'bondage'], add: ['praise-f-to-m-receive'] },

  // ═══════════════════════════════════════════════════════════════
  // CNC: not about bondage, about rough (spanking)
  // ═══════════════════════════════════════════════════════════════
  'cnc-he-takes-her': { remove: ['bondage-he-ties-her', 'bondage'] },
  'cnc-she-takes-him': { remove: ['bondage-she-ties-him', 'bondage'] },
  'cnc-he-takes-her-receive': { remove: ['bondage-he-ties-her-receive', 'bondage'] },
  'cnc-she-takes-him-receive': { remove: ['bondage-she-ties-him-receive', 'bondage'] },

  // ═══════════════════════════════════════════════════════════════
  // COLLAR/FEMINIZATION: not about lingerie
  // ═══════════════════════════════════════════════════════════════
  'collar-he-owns-her': { remove: ['lingerie-lace', 'lingerie'] },
  'collar-he-owns-her-receive': { remove: ['lingerie-lace', 'lingerie'] },
  'collar-she-owns-him': { remove: ['lingerie-lace', 'lingerie'] },
  'collar-she-owns-him-receive': { remove: ['lingerie-lace', 'lingerie'] },
  'feminization-do': { remove: ['lingerie-lace', 'lingerie'] },
  'feminization-wear': { remove: ['lingerie-lace', 'lingerie'] },

  // ═══════════════════════════════════════════════════════════════
  // FOOT WORSHIP: independent fetish, not about lingerie
  // ═══════════════════════════════════════════════════════════════
  'foot-worship-m-to-f-receive': { remove: ['lingerie-lace', 'heels-only', 'lingerie'] },
  'foot-worship-he-worships-her': { remove: ['lingerie-lace', 'heels-only', 'lingerie'] },
  'foot-worship-f-to-m-receive': { remove: ['lingerie-lace', 'heels-only', 'lingerie'] },
  'foot-worship-she-worships-him': { remove: ['lingerie-lace', 'heels-only', 'lingerie'] },

  // ═══════════════════════════════════════════════════════════════
  // ORAL chain
  // ═══════════════════════════════════════════════════════════════
  'cock-worship': { add: ['blowjob'] },
  'pussy-worship': { add: ['cunnilingus'] },
  'squirting': { add: ['cunnilingus', 'vibrator-play'] },
  'squirt-receiving': { add: ['cunnilingus'] },
  'squirting-watch': { add: ['cunnilingus', 'vibrator-play'] },

  // ═══════════════════════════════════════════════════════════════
  // ANAL chain
  // ═══════════════════════════════════════════════════════════════
  'pegging': { add: ['anal-play-on-him'] },
  'pegging-receive': { add: ['anal-play-on-him-receive'] },
  'anal-sex-give': { add: ['anal-play-on-her'] },
  'anal-sex-receive': { add: ['anal-play-on-her-receive'] },

  // ═══════════════════════════════════════════════════════════════
  // ROUGH escalation chain
  // ═══════════════════════════════════════════════════════════════
  'choking-he-chokes-her': { add: ['spanking-he-spanks-her'] },
  'choking-she-chokes-him': { add: ['spanking-she-spanks-him'] },
  'choking-m-to-f-receive': { add: ['spanking-m-to-f-receive'] },
  'choking-f-to-m-receive': { add: ['spanking-f-to-m-receive'] },

  'face-slapping-he-slaps-her': { add: ['choking-he-chokes-her'] },
  'face-slapping-she-slaps-him': { add: ['choking-she-chokes-him'] },
  'face-slapping-m-to-f-receive': { add: ['choking-m-to-f-receive'] },
  'face-slapping-f-to-m-receive': { add: ['choking-f-to-m-receive'] },

  'breath-play-m-to-f': { add: ['face-slapping-he-slaps-her'] },
  'breath-play-f-to-m': { add: ['face-slapping-she-slaps-him'] },
  'breath-play-m-to-f-receive': { add: ['face-slapping-m-to-f-receive'] },
  'breath-play-f-to-m-receive': { add: ['face-slapping-f-to-m-receive'] },

  'knife-play-m-to-f': { add: ['whipping-m-to-f'] },
  'knife-play-f-to-m': { add: ['whipping-f-to-m'] },
  'knife-play-m-to-f-receive': { add: ['whipping-m-to-f-receive'] },
  'knife-play-f-to-m-receive': { add: ['whipping-f-to-m-receive'] },

  'needle-play-m-to-f': { add: ['whipping-m-to-f'] },
  'needle-play-f-to-m': { add: ['whipping-f-to-m'] },
  'needle-play-m-to-f-receive': { add: ['whipping-m-to-f-receive'] },
  'needle-play-f-to-m-receive': { add: ['whipping-f-to-m-receive'] },

  // ═══════════════════════════════════════════════════════════════
  // BONDAGE/CONTROL chain
  // ═══════════════════════════════════════════════════════════════
  'forced-orgasm-on-her': { add: ['edging-he-controls-her', 'vibrator-play'] },
  'forced-orgasm-on-him': { add: ['edging-she-controls-him'] },
  'forced-orgasm-m-to-f-receive': { add: ['edging-m-to-f-receive'] },
  'forced-orgasm-f-to-m-receive': { add: ['edging-f-to-m-receive'] },

  'ruined-orgasm-m-to-f': { add: ['forced-orgasm-on-her'] },
  'ruined-orgasm-f-to-m': { add: ['forced-orgasm-on-him'] },
  'ruined-orgasm-m-to-f-receive': { add: ['forced-orgasm-m-to-f-receive'] },
  'ruined-orgasm-f-to-m-receive': { add: ['forced-orgasm-f-to-m-receive'] },

  'pet-play-she-is-pet-sub': { add: ['collar-he-owns-her'] },
  'pet-play-she-is-pet-owner': { add: ['collar-he-owns-her-receive'] },
  'pet-play-he-is-pet-sub': { add: ['collar-she-owns-him'] },
  'pet-play-he-is-pet-owner': { add: ['collar-she-owns-him-receive'] },
  'pet-play-f-is-pet': { add: ['collar-he-owns-her'] },
  'pet-play-m-is-pet': { add: ['collar-she-owns-him'] },

  'somnophilia-m-to-f': { add: ['free-use-f-available'] },
  'somnophilia-f-to-m': { add: ['free-use-m-available'] },
  'somnophilia-m-to-f-receive': { add: ['free-use-f-available-receive'] },
  'somnophilia-f-to-m-receive': { add: ['free-use-m-available-receive'] },

  // ═══════════════════════════════════════════════════════════════
  // GROUP chain
  // ═══════════════════════════════════════════════════════════════
  'cuckold-watch': { add: ['threesome-mfm'] },
  'cuckold-play': { add: ['threesome-mfm'] },
  'hotwife-stag': { add: ['threesome-mfm'] },
  'hotwife-vixen-f': { add: ['threesome-mfm'] },
  'gangbang': { add: ['threesome-mfm'] },
  'double-penetration': { add: ['threesome-mfm', 'anal-play-on-her'] },
  'orgy': { add: ['threesome-fmf', 'threesome-mfm'] },

  // ═══════════════════════════════════════════════════════════════
  // DIRTY TALK chain
  // ═══════════════════════════════════════════════════════════════
  'degradation-he-degrades-her': { add: ['dirty-talk'] },
  'degradation-she-degrades-him': { add: ['dirty-talk'] },
  'degradation-m-to-f': { add: ['dirty-talk'] },
  'degradation-f-to-m': { add: ['dirty-talk'] },
  'degradation-m-to-f-receive': { add: ['dirty-talk', 'face-slapping-m-to-f-receive'] },
  'degradation-f-to-m-receive': { add: ['dirty-talk', 'face-slapping-f-to-m-receive'] },

  // ═══════════════════════════════════════════════════════════════
  // MASSAGE/WORSHIP chain
  // ═══════════════════════════════════════════════════════════════
  'body-worship-he-worships-her': { add: ['massage-he-massages-her'] },
  'body-worship-she-worships-him': { add: ['massage-she-massages-him'] },
  'body-worship-m-to-f': { add: ['massage-m-to-f'] },
  'body-worship-f-to-m': { add: ['massage-f-to-m'] },
  'body-worship-m-to-f-receive': { add: ['massage-m-to-f-receive'] },
  'body-worship-f-to-m-receive': { add: ['massage-f-to-m-receive'] },
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

let removedCount = 0;
let addedCount = 0;
let unchangedCount = 0;
const changes: string[] = [];

const files = getAllJsonFiles(COMPOSITE_DIR);
for (const filePath of files) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);
    const slug = scene.slug;

    if (!slug) continue;

    const fix = CLARIFICATION_FIXES[slug];
    if (!fix) {
      unchangedCount++;
      continue;
    }

    const original = scene.clarification_for ? [...scene.clarification_for] : [];
    let newClarificationFor = [...original];
    let hasChanges = false;

    // Remove specified parents
    if (fix.remove && fix.remove.length > 0) {
      const before = newClarificationFor.length;
      newClarificationFor = newClarificationFor.filter(p => !fix.remove!.includes(p));
      if (newClarificationFor.length < before) {
        hasChanges = true;
        removedCount += before - newClarificationFor.length;
      }
    }

    // Add specified parents
    if (fix.add && fix.add.length > 0) {
      for (const parent of fix.add) {
        if (!newClarificationFor.includes(parent)) {
          newClarificationFor.push(parent);
          hasChanges = true;
          addedCount++;
        }
      }
    }

    if (hasChanges) {
      if (newClarificationFor.length === 0) {
        delete scene.clarification_for;
      } else {
        scene.clarification_for = newClarificationFor;
      }
      fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
      changes.push(`[CHANGED] ${slug}: [${original.join(', ') || '(none)'}] -> [${newClarificationFor.join(', ') || '(none)'}]`);
    } else {
      unchangedCount++;
    }
  } catch (e) {
    console.error(`Failed to process ${filePath}:`, e);
  }
}

// Output results
console.log('=== CLARIFICATION CHAIN FIXES ===\n');
for (const c of changes.sort()) {
  console.log(c);
}

console.log('\n=== SUMMARY ===');
console.log(`Parents removed: ${removedCount}`);
console.log(`Parents added: ${addedCount}`);
console.log(`Scenes changed: ${changes.length}`);
console.log(`Scenes unchanged: ${unchangedCount}`);

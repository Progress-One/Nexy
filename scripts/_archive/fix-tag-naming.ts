/**
 * Fix tag naming inconsistencies in composite scenes
 *
 * Fixes:
 * 1. Singular/plural: plug→plugs, preferences→preference, restraints→restraint, uniforms→uniform
 * 2. Duplicates: anal_sex→anal, exhibitionism-lite→exhibitionism
 * 3. Consolidation: restraint/restraints→bondage (where appropriate)
 *
 * Run: npx tsx scripts/fix-tag-naming.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'composite');

// Tag replacements: old → new
const TAG_REPLACEMENTS: Record<string, string> = {
  // Singular/plural fixes
  'plug': 'plugs',
  'preferences': 'preference',
  'restraints': 'restraint',
  'uniforms': 'uniform',

  // Duplicate/variant consolidation
  'anal_sex': 'anal',
  'exhibitionism-lite': 'exhibitionism',

  // Optional: restraint → bondage consolidation
  // Uncomment if you want to merge restraint into bondage
  // 'restraint': 'bondage',
};

// Tags to remove entirely (redundant)
const TAGS_TO_REMOVE: string[] = [
  // Add any tags that should be completely removed
];

interface SceneFile {
  slug: string;
  tags?: string[];
  [key: string]: unknown;
}

interface ProcessResult {
  updated: number;
  skipped: number;
  errors: string[];
  details: {
    tagsReplaced: number;
    tagsRemoved: number;
    scenesAffected: string[];
  };
}

function processDirectory(dir: string): ProcessResult {
  const result: ProcessResult = {
    updated: 0,
    skipped: 0,
    errors: [],
    details: {
      tagsReplaced: 0,
      tagsRemoved: 0,
      scenesAffected: [],
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
      result.details.tagsReplaced += subResult.details.tagsReplaced;
      result.details.tagsRemoved += subResult.details.tagsRemoved;
      result.details.scenesAffected.push(...subResult.details.scenesAffected);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const scene: SceneFile = JSON.parse(content);

        if (!scene.tags || !Array.isArray(scene.tags)) {
          result.skipped++;
          continue;
        }

        let modified = false;
        const originalTags = [...scene.tags];
        const newTags: string[] = [];

        for (const tag of scene.tags) {
          // Check if tag should be removed
          if (TAGS_TO_REMOVE.includes(tag)) {
            result.details.tagsRemoved++;
            modified = true;
            continue;
          }

          // Check if tag should be replaced
          if (TAG_REPLACEMENTS[tag]) {
            const newTag = TAG_REPLACEMENTS[tag];
            // Avoid duplicates
            if (!newTags.includes(newTag)) {
              newTags.push(newTag);
            }
            result.details.tagsReplaced++;
            modified = true;
          } else {
            // Keep original tag (avoid duplicates)
            if (!newTags.includes(tag)) {
              newTags.push(tag);
            }
          }
        }

        if (modified) {
          scene.tags = newTags;
          fs.writeFileSync(fullPath, JSON.stringify(scene, null, 2) + '\n');
          console.log(`Updated: ${scene.slug}`);
          console.log(`  Before: [${originalTags.join(', ')}]`);
          console.log(`  After:  [${newTags.join(', ')}]`);
          result.details.scenesAffected.push(scene.slug);
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

async function main() {
  console.log('='.repeat(60));
  console.log('Tag Naming Fix: Standardizing tags in composite scenes');
  console.log('='.repeat(60));
  console.log('\nReplacements:');
  for (const [oldTag, newTag] of Object.entries(TAG_REPLACEMENTS)) {
    console.log(`  ${oldTag} → ${newTag}`);
  }
  if (TAGS_TO_REMOVE.length > 0) {
    console.log('\nTags to remove:');
    for (const tag of TAGS_TO_REMOVE) {
      console.log(`  ${tag}`);
    }
  }
  console.log(`\nScanning: ${SCENES_DIR}\n`);

  const result = processDirectory(SCENES_DIR);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Updated files:       ${result.updated}`);
  console.log(`Skipped (no change): ${result.skipped}`);
  console.log(`Errors:              ${result.errors.length}`);
  console.log('\nDetails:');
  console.log(`  Tags replaced: ${result.details.tagsReplaced}`);
  console.log(`  Tags removed:  ${result.details.tagsRemoved}`);
  console.log(`  Scenes affected: ${result.details.scenesAffected.length}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Tag naming fix complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);

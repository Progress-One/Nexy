/**
 * Unify onboarding_paired_with and paired_scene into single field: paired_scene
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

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

let unified = 0;
let alreadyOk = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    const scene = JSON.parse(content);

    // Check if has onboarding_paired_with but not paired_scene
    if (scene.onboarding_paired_with && !scene.paired_scene) {
      // Rename field in raw content to preserve formatting
      const updatedContent = content.replace(
        /"onboarding_paired_with":/,
        '"paired_scene":'
      );

      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ ${path.relative(COMPOSITE_DIR, filePath)}: onboarding_paired_with → paired_scene`);
      unified++;
    } else if (scene.paired_scene) {
      alreadyOk++;
    }
  } catch (e) {
    console.log(`❌ ${path.relative(COMPOSITE_DIR, filePath)}: ${(e as Error).message}`);
  }
}

console.log(`\n✅ Unified: ${unified} files`);
console.log(`⏭️  Already OK: ${alreadyOk} files`);

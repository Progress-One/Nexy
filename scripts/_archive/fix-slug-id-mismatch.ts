/**
 * Fix SLUG_MISMATCH - make ID match slug (both hyphens)
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

let fixed = 0;
let skipped = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    const scene = JSON.parse(content);

    // Check if ID and slug mismatch
    if (scene.id && scene.slug && scene.id !== scene.slug) {
      // Make ID match slug (slug is the source of truth)
      const updatedContent = content.replace(
        /"id": "[^"]+"/,
        `"id": "${scene.slug}"`
      );

      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✅ ${path.relative(COMPOSITE_DIR, filePath)}: ${scene.id} → ${scene.slug}`);
      fixed++;
    } else {
      skipped++;
    }
  } catch (e) {
    console.log(`❌ ${path.relative(COMPOSITE_DIR, filePath)}: ${(e as Error).message}`);
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`⏭️  Skipped (already matching): ${skipped} files`);

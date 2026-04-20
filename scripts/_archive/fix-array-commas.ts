/**
 * Fix missing commas in arrays
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
const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    JSON.parse(content);
    continue; // Already valid
  } catch (e) {
    // Needs fixing
  }

  let fixedContent = content
    // Add comma between } and "options": [
    .replace(/\}\n(\s+)"options":/g, '},\n$1"options":')
    // Add comma between array elements: } \n { becomes }, \n {
    .replace(/\}\n(\s+)\{/g, '},\n$1{')
    // Add comma between ] \n { (array end to next object)
    .replace(/\]\n(\s+)\{/g, '],\n$1{');

  try {
    JSON.parse(fixedContent);
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`✅ ${filePath}`);
    fixed++;
  } catch (e2) {
    console.log(`❌ ${filePath}: ${(e2 as Error).message}`);
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);

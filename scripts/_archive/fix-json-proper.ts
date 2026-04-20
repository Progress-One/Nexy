/**
 * Properly fix JSON - parse and re-stringify to ensure valid format
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
let errors = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    const parsed = JSON.parse(content);
    // Re-stringify with proper formatting
    const formatted = JSON.stringify(parsed, null, 2);
    fs.writeFileSync(filePath, formatted + '\n', 'utf-8');
    fixed++;
  } catch (e) {
    console.log(`❌ ${filePath}: ${(e as Error).message}`);
    errors++;
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`❌ Errors: ${errors} files`);

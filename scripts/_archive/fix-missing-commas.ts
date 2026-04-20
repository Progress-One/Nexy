/**
 * Fix missing commas in JSON files after bad sed replacement
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
let alreadyValid = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Try to parse - if it works, skip
  try {
    JSON.parse(content);
    alreadyValid++;
    continue;
  } catch (e) {
    // Has syntax error, fix it
  }

  // Add comma between closing } and opening " for next property
  // Pattern: }\n  "field": becomes },\n  "field":
  let fixedContent = content
    .replace(/\}\n(\s*)"([a-z_]+)":/g, '},\n$1"$2":')
    .replace(/\]\n(\s*)"([a-z_]+)":/g, '],\n$1"$2":');

  // Also fix the extra closing brace issue in question blocks
  // Pattern: },\n      } becomes }\n  }
  fixedContent = fixedContent.replace(/\},\n(\s+)\}/g, '}\n  }');

  // Try to parse the fixed content
  try {
    JSON.parse(fixedContent);
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`✅ ${filePath}`);
    fixed++;
  } catch (e2) {
    console.log(`❌ Could not fix: ${filePath}`);
    console.log(`   Error: ${(e2 as Error).message}`);
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`✓ Already valid: ${alreadyValid} files`);

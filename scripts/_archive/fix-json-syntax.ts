/**
 * Fix JSON syntax errors after multi_select -> swipe conversion
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
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Try to parse - if it works, skip
    try {
      JSON.parse(content);
      continue;
    } catch (e) {
      // Has syntax error, try to fix
    }

    // Fix common issues from the regex replacement
    let fixed_content = content
      // Remove trailing comma before closing brace in question.text
      .replace(/("en": "[^"]+"),\s*}/g, '$1\n    }')
      // Remove extra closing brace after question.text
      .replace(/("text": \{[^}]+\}),\s*\}/g, '$1')
      // Clean up double braces
      .replace(/\}\s*\}\s*\}/g, '}\n}');

    // Try to parse the fixed content
    try {
      JSON.parse(fixed_content);
      fs.writeFileSync(filePath, fixed_content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      fixed++;
    } catch (e2) {
      console.log(`❌ Could not auto-fix: ${filePath}`);
      console.log(`   Error: ${e2}`);
      skipped++;
    }
  } catch (e) {
    console.log(`❌ Error reading: ${filePath}:`, e);
    skipped++;
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`❌ Skipped: ${skipped} files (need manual fix)`);

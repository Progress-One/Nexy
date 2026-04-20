/**
 * Restore JSON commas - comprehensive fix
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

function restoreCommas(content: string): string {
  // First, strip ALL trailing commas to have a clean slate
  const cleaned = content.replace(/,(\s*)$/gm, '$1');
  const lines = cleaned.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : null;

    if (!nextLine) {
      result.push(line);
      continue;
    }

    const trimmed = line.trim();
    const nextTrimmed = nextLine.trim();

    // Skip empty lines
    if (!trimmed) {
      result.push(line);
      continue;
    }

    // Add comma if current line ends with:
    // 1. String value: "value" and next line starts with "field":
    if (/^"[^"]+": ".+"$/.test(trimmed) && /^"[^"]+":/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 2. Number/boolean/null/empty string value and next line starts with "field":
    if (/^"[^"]+": (true|false|null|\d+|"")$/.test(trimmed) && /^"[^"]+":/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 2.5. Single-line array: "field": [...] and next line starts with "field":
    if (/^"[^"]+": \[.+\]$/.test(trimmed) && /^"[^"]+":/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 2.6. Single-line object in array: { ... } followed by another { ... }
    if (/^\{ .+ \}$/.test(trimmed) && /^\{ .+ \}$/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 3. Closing } and next line starts with "field": (end of nested object)
    if (trimmed === '}' && /^"[^"]+":/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 4. Closing ] and next line starts with "field": (end of array)
    if (trimmed === ']' && /^"[^"]+":/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 5. Closing } and next line is { (objects in array)
    if (trimmed === '}' && nextTrimmed === '{') {
      result.push(line + ',');
      continue;
    }

    // 6. String in array and next line is string (array elements)
    if (/^"[^"]+"$/.test(trimmed) && /^"[^"]+"$/.test(nextTrimmed)) {
      result.push(line + ',');
      continue;
    }

    // 7. String in array and next line is ] (last element, no comma)
    if (/^"[^"]+"$/.test(trimmed) && nextTrimmed === ']') {
      result.push(line);
      continue;
    }

    // 8. Closing } of nested object, next line is also closing }
    // Don't add comma to inner }, only to outer one
    if (trimmed === '}' && nextTrimmed === '}') {
      result.push(line);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

let fixed = 0;
let errors = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const restored = restoreCommas(content);

  // Always write the file (even if still broken, to preserve partial fixes)
  fs.writeFileSync(filePath, restored, 'utf-8');

  // Then validate
  try {
    JSON.parse(restored);
    console.log(`✅ ${path.relative(COMPOSITE_DIR, filePath)}`);
    fixed++;
  } catch (e) {
    console.log(`❌ ${path.relative(COMPOSITE_DIR, filePath)}: ${(e as Error).message.substring(0, 80)}`);
    errors++;
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`❌ Errors: ${errors} files`);

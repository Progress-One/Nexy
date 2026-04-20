/**
 * Smart JSON fix - add commas intelligently
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

function smartFixJson(content: string): string {
  const lines = content.split('\n');
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    if (!nextLine) {
      fixedLines.push(line);
      continue;
    }

    const trimmedLine = line.trim();
    const trimmedNext = nextLine.trim();

    // Add comma if:
    // 1. Line ends with } and next line starts with "field":
    if (trimmedLine === '}' && /^"[^"]+":/.test(trimmedNext)) {
      fixedLines.push(line + ',');
      continue;
    }

    // 2. Line ends with } and next line starts with { (array elements)
    if (trimmedLine === '}' && trimmedNext === '{') {
      fixedLines.push(line + ',');
      continue;
    }

    // 3. Line ends with ] and next line starts with "field":
    if (trimmedLine === ']' && /^"[^"]+":/.test(trimmedNext)) {
      fixedLines.push(line + ',');
      continue;
    }

    fixedLines.push(line);
  }

  return fixedLines.join('\n');
}

let fixed = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fixedContent = smartFixJson(content);

  try {
    JSON.parse(fixedContent);
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`✅ ${filePath}`);
    fixed++;
  } catch (e) {
    // Can't fix automatically, skip
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);

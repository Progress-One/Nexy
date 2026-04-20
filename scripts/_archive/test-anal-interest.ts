/**
 * Debug anal-interest restoration
 */
import fs from 'fs';

function restoreCommas(content: string): string {
  const lines = content.split('\n');
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

    // Debug lines 54-56 (0-indexed: 53-55)
    if (i >= 53 && i <= 55) {
      console.log(`\nLine ${i + 1}:`);
      console.log(`  Content: "${line}"`);
      console.log(`  Trimmed: "${trimmed}"`);
      console.log(`  Next trimmed: "${nextTrimmed}"`);
    }

    // Rule 8: Closing } of nested object, next line is also closing }
    if (trimmed === '}' && nextTrimmed === '}') {
      if (i >= 53 && i <= 55) {
        console.log(`  → Rule 8 matched! Not adding comma.`);
      }
      result.push(line);
      continue;
    }

    // Rule 3: Closing } and next line starts with "field":
    if (trimmed === '}' && /^"[^"]+":/.test(nextTrimmed)) {
      if (i >= 53 && i <= 55) {
        console.log(`  → Rule 3 matched! Adding comma.`);
      }
      result.push(line + ',');
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

const content = fs.readFileSync('scenes/v2/composite/baseline/anal-interest.json', 'utf-8');
const restored = restoreCommas(content);

console.log('\n\nResult lines 54-57:');
const restoredLines = restored.split('\n');
for (let i = 53; i <= 56; i++) {
  console.log(`${i + 1}: ${restoredLines[i]}`);
}

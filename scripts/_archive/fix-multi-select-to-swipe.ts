/**
 * Fix multi_select questions that have no options - convert to swipe
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

interface Scene {
  question?: {
    type: string;
    text?: { ru: string; en: string };
    options?: any[];
    min_selections?: number;
  };
}

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

function convertToSwipe(questionText: { ru: string; en: string }): { ru: string; en: string } {
  // Convert "Что привлекает в X?" to "X — интересно?"
  // Convert "What appeals about X?" to "X — interested?"

  const ruMatch = questionText.ru.match(/Что (привлекает|нравится) (в|про|о) (.+)\?/);
  const enMatch = questionText.en.match(/What (appeals|do you like) (about|in) (.+)\?/);

  if (ruMatch && enMatch) {
    const topicRu = ruMatch[3];
    const topicEn = enMatch[3];
    return {
      ru: `${topicRu.charAt(0).toUpperCase() + topicRu.slice(1)} — интересно?`,
      en: `${topicEn.charAt(0).toUpperCase() + topicEn.slice(1)} — interested?`
    };
  }

  // Fallback: just simplify
  return {
    ru: questionText.ru.replace(/Что (привлекает|нравится)/, '').trim() + '?',
    en: questionText.en.replace(/What (appeals|do you like)/, '').trim() + '?'
  };
}

let fixed = 0;
let skipped = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const scene = JSON.parse(content) as Scene;

  // Check if has multi_select without options
  if (scene.question?.type === 'multi_select' && !scene.question.options) {
    const oldText = scene.question.text;
    if (!oldText) {
      console.log(`⚠️  SKIP: ${filePath} - no question text`);
      skipped++;
      continue;
    }

    // Convert to swipe
    const newContent = content
      .replace(/"type": "multi_select"/, '"type": "swipe"')
      .replace(/"min_selections": \d+,?\n/g, '');

    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✅ ${filePath}`);
    fixed++;
  }
}

console.log(`\n✅ Fixed: ${fixed} files`);
console.log(`⏭️  Skipped: ${skipped} files`);

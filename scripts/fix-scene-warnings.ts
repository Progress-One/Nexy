/**
 * Fix scene warnings:
 * 1. Remove "?" from swipe question.text (should be statements)
 * 2. Add scene_type: 'clarification' to non-baseline scenes
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

interface Scene {
  slug?: string;
  scene_type?: string;
  question?: {
    type?: string;
    text?: { ru?: string; en?: string };
  };
  is_active?: boolean;
  category?: string;
  [key: string]: unknown;
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

let fixedQuestionMarks = 0;
let addedSceneType = 0;
let errors: string[] = [];

const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(COMPOSITE_DIR, filePath);
  const category = relPath.split(path.sep)[0];

  try {
    const scene = JSON.parse(content) as Scene;
    let modified = false;

    // Skip inactive scenes
    if (scene.is_active === false) continue;

    // 1. Remove "?" from swipe question.text
    const questionType = scene.question?.type;
    if (!questionType || questionType === 'swipe' || questionType === 'scale') {
      if (scene.question?.text?.ru && scene.question.text.ru.includes('?')) {
        scene.question.text.ru = scene.question.text.ru.replace(/\?/g, '');
        modified = true;
        fixedQuestionMarks++;
        console.log(`✅ ${relPath}: removed "?" from question.text.ru`);
      }
      if (scene.question?.text?.en && scene.question.text.en.includes('?')) {
        scene.question.text.en = scene.question.text.en.replace(/\?/g, '');
        modified = true;
        if (!scene.question?.text?.ru?.includes('?')) {
          fixedQuestionMarks++;
          console.log(`✅ ${relPath}: removed "?" from question.text.en`);
        }
      }
    }

    // 2. Add scene_type: 'clarification' to non-baseline scenes
    if (category !== 'baseline' && !scene.scene_type) {
      scene.scene_type = 'clarification';
      modified = true;
      addedSceneType++;
      console.log(`✅ ${relPath}: added scene_type: 'clarification'`);
    }

    if (modified) {
      const updatedContent = JSON.stringify(scene, null, 2);
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
    }

  } catch (e) {
    errors.push(`${relPath}: ${(e as Error).message}`);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Fixed question marks: ${fixedQuestionMarks} files`);
console.log(`Added scene_type: ${addedSceneType} files`);
if (errors.length > 0) {
  console.log(`\nErrors:`);
  errors.forEach(e => console.log(`  ${e}`));
}

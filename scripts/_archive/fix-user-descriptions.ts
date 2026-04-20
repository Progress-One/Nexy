/**
 * Fix user_description fields to use second person ("Ты") instead of third person ("Он/Она")
 *
 * Pattern:
 * - for_gender: "male" (scene shown to men):
 *   - If he does something: "Ты делаешь..." (you do)
 *   - If she does to him: "Она делает тебе..." (she does to you)
 *
 * - for_gender: "female" (scene shown to women):
 *   - If she does something: "Ты делаешь..." (you do)
 *   - If he does to her: "Он делает тебе..." (he does to you)
 */

import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'composite');

interface Scene {
  slug: string;
  for_gender: 'male' | 'female' | null;
  role_direction: string;
  user_description?: {
    ru: string;
    en: string;
  };
  [key: string]: any;
}

// Collect all files needing attention
const filesNeedingFix: Array<{
  path: string;
  slug: string;
  for_gender: string | null;
  role_direction: string;
  current_ru: string;
  current_en: string;
}> = [];

function walkDir(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (item.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const scene: Scene = JSON.parse(content);

  if (!scene.user_description?.ru) return;

  const ru = scene.user_description.ru;

  // Check if description starts with third person pronouns
  const startsWithThirdPerson = /^(Он |Она |Мужчина |Женщина |Партнёр)/.test(ru);

  if (startsWithThirdPerson) {
    filesNeedingFix.push({
      path: filePath,
      slug: scene.slug,
      for_gender: scene.for_gender,
      role_direction: scene.role_direction || 'unknown',
      current_ru: ru,
      current_en: scene.user_description.en || '',
    });
  }
}

// Main
console.log('Scanning for files with third-person descriptions...\n');

const allFiles = walkDir(SCENES_DIR);
allFiles.forEach(analyzeFile);

console.log(`Found ${filesNeedingFix.length} files needing attention:\n`);

// Group by for_gender
const byGender = {
  male: filesNeedingFix.filter(f => f.for_gender === 'male'),
  female: filesNeedingFix.filter(f => f.for_gender === 'female'),
  null: filesNeedingFix.filter(f => f.for_gender === null),
};

console.log(`\n=== FOR MALES (${byGender.male.length} files) ===`);
byGender.male.forEach(f => {
  console.log(`\n${f.slug} (${f.role_direction}):`);
  console.log(`  RU: ${f.current_ru}`);
});

console.log(`\n=== FOR FEMALES (${byGender.female.length} files) ===`);
byGender.female.forEach(f => {
  console.log(`\n${f.slug} (${f.role_direction}):`);
  console.log(`  RU: ${f.current_ru}`);
});

console.log(`\n=== MUTUAL/NULL (${byGender.null.length} files) ===`);
byGender.null.forEach(f => {
  console.log(`\n${f.slug} (${f.role_direction}):`);
  console.log(`  RU: ${f.current_ru}`);
});

// Export for manual review
const outputPath = path.join(__dirname, 'descriptions-to-fix.json');
fs.writeFileSync(outputPath, JSON.stringify(filesNeedingFix, null, 2));
console.log(`\nExported to ${outputPath}`);

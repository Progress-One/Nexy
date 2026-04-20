import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '../scenes/v2/composite');

interface Scene {
  slug: string;
  is_active: boolean;
  for_gender: string | null;
  user_description: { ru: string; en: string };
  [key: string]: any;
}

// Find all JSON files recursively
function findJsonFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (item.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Check if user_description has problematic "или" pattern
function hasProblematicOr(desc: string): boolean {
  // Skip if already a statement (ends with period)
  if (desc.endsWith('.') && !desc.includes(' — или ') && !desc.includes('? ')) {
    // Check for patterns like "X или Y" at the end
    const orPatterns = [
      / или [а-яё]+\.$/i,  // ends with "или word."
      / — или /i,           // has " — или "
      /\(или [а-яё/]+\)/i,  // has "(или something)"
    ];
    return orPatterns.some(p => p.test(desc));
  }

  // Questions with "или" are problematic
  if (desc.includes('?') && desc.includes('или')) {
    return true;
  }

  return false;
}

function main() {
  const files = findJsonFiles(SCENES_DIR);
  const problematic: { file: string; slug: string; desc: string; gender: string | null }[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const scene: Scene = JSON.parse(content);

      // Skip inactive scenes
      if (scene.is_active === false) continue;

      const ruDesc = scene.user_description?.ru || '';

      // Check for "или" patterns
      if (ruDesc.includes('или') || ruDesc.includes(' — или')) {
        problematic.push({
          file: path.relative(SCENES_DIR, file),
          slug: scene.slug,
          desc: ruDesc,
          gender: scene.for_gender
        });
      }
    } catch (e) {
      console.error(`Error parsing ${file}:`, e);
    }
  }

  console.log(`\n=== ACTIVE SCENES WITH "или" IN user_description ===\n`);
  console.log(`Found ${problematic.length} scenes:\n`);

  // Group by category
  const byCategory: Record<string, typeof problematic> = {};
  for (const p of problematic) {
    const category = path.dirname(p.file);
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(p);
  }

  for (const [category, scenes] of Object.entries(byCategory)) {
    console.log(`\n## ${category.toUpperCase()}\n`);
    for (const s of scenes) {
      console.log(`**${s.slug}** | ${s.gender || 'mutual'}`);
      console.log(`> ${s.desc}`);
      console.log();
    }
  }
}

main();

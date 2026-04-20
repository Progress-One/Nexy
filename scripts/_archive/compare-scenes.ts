/**
 * Compare old scene map with new scenes
 * Find what's missing or changed
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';
const ONBOARDING_DIR = 'scenes/v2/onboarding';

// Extract scene slugs from old map file
const oldMapContent = fs.readFileSync('docs/_archive/old-analysis/scene-map.md', 'utf-8');

// Parse old scenes from markdown
const oldScenes = new Set<string>();
const oldCategories = new Map<string, string[]>();

let currentCategory = '';
const lines = oldMapContent.split('\n');
for (const line of lines) {
  if (line.startsWith('## ') && !line.includes('Summary')) {
    currentCategory = line.replace('## ', '').split(' ')[0];
    oldCategories.set(currentCategory, []);
  }
  // Match scene entries: "- slug-name (role_direction) [INACTIVE]"
  const match = line.match(/^- ([a-z0-9-]+)\s*\(/);
  if (match) {
    const slug = match[1];
    oldScenes.add(slug);
    if (currentCategory && oldCategories.has(currentCategory)) {
      oldCategories.get(currentCategory)!.push(slug);
    }
  }
}

// Get current composite scenes
const currentScenes = new Set<string>();
const currentCategories = new Map<string, string[]>();

function getAllJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
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

const compositeFiles = getAllJsonFiles(COMPOSITE_DIR);
for (const filePath of compositeFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);
    const slug = scene.slug || path.basename(filePath, '.json');
    currentScenes.add(slug);

    const relPath = path.relative(COMPOSITE_DIR, filePath);
    const category = relPath.split(path.sep)[0];
    if (!currentCategories.has(category)) {
      currentCategories.set(category, []);
    }
    currentCategories.get(category)!.push(slug);
  } catch (e) {
    // Skip invalid files
  }
}

// Get onboarding scenes
const onboardingScenes = new Set<string>();
const onboardingFiles = getAllJsonFiles(ONBOARDING_DIR);
for (const filePath of onboardingFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);
    const slug = scene.slug || path.basename(filePath, '.json');
    onboardingScenes.add(slug);
  } catch (e) {
    // Skip
  }
}

// Compare
console.log('# СРАВНЕНИЕ СЦЕН\n');
console.log('## Статистика\n');
console.log(`| Метрика | Старый набор | Новый набор |`);
console.log(`|---------|--------------|-------------|`);
console.log(`| Composite сцены | ${oldScenes.size} | ${currentScenes.size} |`);
console.log(`| Категории | ${oldCategories.size} | ${currentCategories.size} |`);
console.log(`| Онбординг сцены | ? | ${onboardingScenes.size} |`);

// Find missing in new (was in old, not in new)
const missingInNew = [...oldScenes].filter(s => !currentScenes.has(s) && !onboardingScenes.has(s));

// Find new scenes (not in old)
const newScenes = [...currentScenes].filter(s => !oldScenes.has(s));

// Find missing categories
const oldCats = [...oldCategories.keys()];
const newCats = [...currentCategories.keys()];
const missingCats = oldCats.filter(c => !newCats.includes(c));
const newCats2 = newCats.filter(c => !oldCats.includes(c));

console.log('\n## Потерянные сцены (были в старом, нет в новом)\n');
if (missingInNew.length === 0) {
  console.log('Нет потерянных сцен!');
} else {
  console.log(`Всего: ${missingInNew.length}\n`);

  // Group by pattern
  const grouped = new Map<string, string[]>();
  for (const slug of missingInNew.sort()) {
    // Find old category
    let cat = 'unknown';
    for (const [c, slugs] of oldCategories) {
      if (slugs.includes(slug)) {
        cat = c;
        break;
      }
    }
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(slug);
  }

  for (const [cat, slugs] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`### ${cat} (${slugs.length})`);
    for (const slug of slugs) {
      console.log(`- ${slug}`);
    }
    console.log('');
  }
}

console.log('\n## Новые сцены (не было в старом)\n');
if (newScenes.length === 0) {
  console.log('Нет новых сцен');
} else {
  console.log(`Всего: ${newScenes.length}\n`);
  for (const slug of newScenes.slice(0, 50).sort()) {
    console.log(`- ${slug}`);
  }
  if (newScenes.length > 50) {
    console.log(`... и ещё ${newScenes.length - 50}`);
  }
}

console.log('\n## Категории\n');
console.log(`Потерянные категории: ${missingCats.join(', ') || 'нет'}`);
console.log(`Новые категории: ${newCats2.join(', ') || 'нет'}`);

// OLD ONBOARDING CATEGORIES
console.log('\n## Старый онбординг (categories.json)\n');
const oldCategories2 = [
  'oral-give', 'oral-receive', 'anal-give', 'anal-receive', 'group', 'toys',
  'roleplay', 'quickie', 'romantic', 'power-dom', 'power-sub', 'rough-give',
  'rough-receive', 'public', 'exhibitionism', 'recording', 'dirty-talk-give',
  'dirty-talk-receive', 'praise-give', 'praise-receive', 'lingerie',
  'foot-give', 'foot-receive', 'bondage-give', 'bondage-receive',
  'body-fluids-give', 'body-fluids-receive', 'sexting', 'extreme'
];
console.log('Темы онбординга:\n');
for (const cat of oldCategories2) {
  console.log(`- ${cat}`);
}

console.log('\n## Анализ потерь\n');

// Analyze what we actually lost
const significantLosses = [
  // From impact-pain - give/receive patterns
  'cbt-give', 'cbt-receive',
  'choking-he-chokes-her-give', 'choking-he-chokes-her-receive',
  'choking-she-chokes-him-give', 'choking-she-chokes-him-receive',
  'face-slapping-he-slaps-her-give', 'face-slapping-he-slaps-her-receive',
  'face-slapping-she-slaps-him-give', 'face-slapping-she-slaps-him-receive',
  'nipple-play-he-on-her-give', 'nipple-play-he-on-her-receive',
  'nipple-play-she-on-him-give', 'nipple-play-she-on-him-receive',
  'spanking-he-spanks-her-give', 'spanking-he-spanks-her-receive',
  'spanking-she-spanks-him-give', 'spanking-she-spanks-him-receive',
  'wax-play-he-on-her-give', 'wax-play-he-on-her-receive',
  'wax-play-she-on-him-give', 'wax-play-she-on-him-receive',
  'whipping-f-to-m-give', 'whipping-f-to-m-receive',
  'whipping-m-to-f-give', 'whipping-m-to-f-receive',
];

// Check if the core actions exist
const coreActions = [
  'cbt', 'choking', 'face-slapping', 'nipple-play', 'spanking', 'wax-play', 'whipping',
  'blowjob', 'cunnilingus', 'deepthroat', 'facesitting', 'rimming',
  'bondage', 'collar', 'edging', 'forced-orgasm', 'free-use', 'ruined-orgasm',
  'degradation', 'praise', 'dirty-talk',
];

console.log('Ключевые действия (есть ли хотя бы одна сцена):\n');
for (const action of coreActions) {
  const found = [...currentScenes].filter(s => s.includes(action));
  const status = found.length > 0 ? '✓' : '✗';
  console.log(`${status} ${action}: ${found.length} сцен`);
}

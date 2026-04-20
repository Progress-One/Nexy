import * as fs from 'fs';
import * as path from 'path';

interface LocalizedText {
  ru: string;
  en: string;
}

interface FollowUp {
  id: string;
  type: string;
  question: LocalizedText;
  config?: {
    options?: { id: string; label: LocalizedText }[];
    min_label?: LocalizedText;
    max_label?: LocalizedText;
  };
  follow_ups?: FollowUp[];
}

interface Element {
  id: string;
  label: LocalizedText;
  follow_ups?: FollowUp[];
}

interface Scene {
  id: string;
  slug: string;
  title: LocalizedText;
  elements?: Element[];
  question?: {
    type: string;
    text: LocalizedText;
  };
}

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2');

function printFollowUp(followUp: FollowUp, indent: string, lang: 'ru' | 'en' = 'ru'): void {
  const typeIcon = {
    'multi_select': '☑',
    'single_select': '◉',
    'scale': '⟷',
    'text': '✎',
  }[followUp.type] || '?';

  console.log(`${indent}${typeIcon} ${followUp.question[lang]} [${followUp.type}]`);

  if (followUp.config?.options) {
    for (const opt of followUp.config.options) {
      console.log(`${indent}    • ${opt.label[lang]}`);
    }
  }

  if (followUp.config?.min_label && followUp.config?.max_label) {
    console.log(`${indent}    ${followUp.config.min_label[lang]} ←→ ${followUp.config.max_label[lang]}`);
  }

  // Nested follow-ups
  if (followUp.follow_ups) {
    for (const nested of followUp.follow_ups) {
      printFollowUp(nested, indent + '      ', lang);
    }
  }
}

function printElement(element: Element, indent: string, lang: 'ru' | 'en' = 'ru'): void {
  console.log(`${indent}├─ ${element.label[lang]} [${element.id}]`);

  if (element.follow_ups) {
    for (const followUp of element.follow_ups) {
      printFollowUp(followUp, indent + '│    ', lang);
    }
  }
}

function printScene(scene: Scene, lang: 'ru' | 'en' = 'ru'): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📋 ${scene.title[lang]}`);
  console.log(`   slug: ${scene.slug}`);

  if (scene.question) {
    console.log(`   ❓ ${scene.question.text[lang]} [${scene.question.type}]`);
  }
  console.log(`${'─'.repeat(60)}`);

  if (scene.elements && scene.elements.length > 0) {
    console.log('   Elements:');
    for (const element of scene.elements) {
      printElement(element, '   ', lang);
    }
  } else {
    console.log('   (no elements)');
  }
}

function findSceneFiles(dir: string): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findSceneFiles(fullPath));
    } else if (item.name.endsWith('.json') && !item.name.includes('flow-rules')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const args = process.argv.slice(2);
  const lang = (args.includes('--en') ? 'en' : 'ru') as 'ru' | 'en';
  const filterSlug = args.find(a => !a.startsWith('--'));

  console.log(`\n🌳 SCENE TREE (${lang.toUpperCase()})`);
  console.log(`${'═'.repeat(60)}`);

  const sceneFiles = findSceneFiles(SCENES_DIR);
  let scenesWithElements = 0;
  let totalElements = 0;
  let totalFollowUps = 0;

  const countFollowUps = (followUps?: FollowUp[]): number => {
    if (!followUps) return 0;
    let count = followUps.length;
    for (const f of followUps) {
      count += countFollowUps(f.follow_ups);
    }
    return count;
  };

  for (const file of sceneFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const scene: Scene = JSON.parse(content);

      // Filter by slug if specified
      if (filterSlug && !scene.slug.includes(filterSlug)) {
        continue;
      }

      // Count stats
      if (scene.elements && scene.elements.length > 0) {
        scenesWithElements++;
        totalElements += scene.elements.length;
        for (const el of scene.elements) {
          totalFollowUps += countFollowUps(el.follow_ups);
        }
      }

      printScene(scene, lang);
    } catch (e) {
      // Skip invalid files
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 STATS:`);
  console.log(`   Scenes with elements: ${scenesWithElements}`);
  console.log(`   Total elements: ${totalElements}`);
  console.log(`   Total follow-ups: ${totalFollowUps}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main();

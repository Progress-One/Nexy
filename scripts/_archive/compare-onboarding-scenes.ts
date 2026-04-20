/**
 * Compare onboarding/converted scenes with composite scenes
 * Find better alternatives for onboarding
 */

import fs from 'fs';
import path from 'path';

const CONVERTED_DIR = 'scenes/v2/onboarding/converted';
const COMPOSITE_DIR = 'scenes/v2/composite';

interface Scene {
  slug: string;
  sets_gate?: string;
  for_gender?: string;
  title: { ru: string; en: string };
  is_onboarding?: boolean;
  category?: string;
}

// Map categories to expected composite scenes
const CATEGORY_MAP: Record<string, string[]> = {
  'oral-give': ['cunnilingus', 'pussy-worship'],
  'oral-receive': ['blowjob', 'cock-worship'],
  'anal-give': ['anal-play-on-her', 'anal-sex-give'],
  'anal-receive': ['anal-play-on-him', 'anal-sex-receive', 'pegging'],
  'bondage-give': ['bondage-m-ties-f'],
  'bondage-receive': ['bondage-f-ties-m'],
  'rough-give': ['spanking-m-to-f', 'choking-m-to-f'],
  'rough-receive': ['spanking-f-to-m', 'choking-f-to-m'],
  'power-dom': ['collar-m-owns-f', 'edging-m-to-f'],
  'power-sub': ['collar-f-owns-m', 'edging-f-to-m'],
  'toys': ['vibrator', 'dildo', 'butt-plug', 'cock-ring'],
  'group': ['threesome-fmf', 'threesome-mfm', 'gangbang'],
  'roleplay': ['boss-m-secretary-f', 'teacher-m-student-f'],
  'exhibitionism': ['exhibitionism', 'voyeurism', 'striptease-f'],
  'dirty-talk-give': ['degradation-m-to-f', 'dirty-talk'],
  'dirty-talk-receive': ['degradation-f-to-m'],
  'praise-give': ['praise-m-to-f'],
  'praise-receive': ['praise-f-to-m'],
  'lingerie': ['lingerie-f', 'stockings'],
  'foot-give': ['foot-worship-m-to-f'],
  'foot-receive': ['foot-worship-f-to-m'],
};

function getAllCompositeScenes(): Map<string, Scene> {
  const scenes = new Map<string, Scene>();

  function scanDir(dir: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.json') && !item.name.startsWith('_')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const scene = JSON.parse(content) as Scene;
          scenes.set(scene.slug, scene);
        } catch (e) {
          // skip
        }
      }
    }
  }

  scanDir(COMPOSITE_DIR);
  return scenes;
}

function main() {
  const convertedFiles = fs.readdirSync(CONVERTED_DIR);
  const compositeScenes = getAllCompositeScenes();

  console.log('# Сравнение онбординг-сцен\n');
  console.log('| Converted (удалить?) | Better Alternative | sets_gate | for_gender |');
  console.log('|---------------------|-------------------|-----------|------------|');

  for (const file of convertedFiles.sort()) {
    const filePath = path.join(CONVERTED_DIR, file);
    const scene = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Scene;

    // Extract category from slug (e.g., onboarding-oral-give-m → oral-give)
    const match = scene.slug.match(/onboarding-(.+?)-(m|f)$/);
    const category = match ? match[1] : scene.slug.replace('onboarding-', '');

    const alternatives = CATEGORY_MAP[category] || [];
    const found = alternatives
      .map(slug => compositeScenes.get(slug))
      .filter(s => s && s.for_gender === scene.for_gender)
      .map(s => s!.slug);

    const altText = found.length > 0 ? found.join(', ') : '❌ НЕТ';

    console.log(
      `| ${scene.slug} | **${altText}** | ${scene.sets_gate || '-'} | ${scene.for_gender || '-'} |`
    );
  }
}

main();

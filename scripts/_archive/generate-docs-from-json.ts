/**
 * Generate documentation from JSON scene files
 *
 * Run with: npx tsx scripts/generate-docs-from-json.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPOSITE_DIR = path.join(__dirname, '../scenes/v2/composite');
const ONBOARDING_DIR = path.join(__dirname, '../scenes/v2/onboarding/converted');
const OUTPUT_FILE = path.join(__dirname, '../docs/all-scenes-ru.md');

interface Scene {
  id: string;
  slug: string;
  title: { ru: string; en: string };
  subtitle?: { ru: string; en: string };
  user_description: { ru: string; en: string };
  category: string;
  intensity: number;
  is_active: boolean;
  for_gender: 'male' | 'female' | null;
  role_direction: string;
  paired_scene?: string;
  clarification_for?: string[];
  sets_gate?: string;
  tags?: string[];
}

function getGenderLabel(forGender: 'male' | 'female' | null): string {
  if (forGender === 'male') return 'М';
  if (forGender === 'female') return 'Ж';
  return 'Все';
}

function loadAllScenes(): Scene[] {
  const scenes: Scene[] = [];

  // Load composite scenes (by category folders)
  const categories = fs.readdirSync(COMPOSITE_DIR);
  for (const category of categories) {
    const categoryPath = path.join(COMPOSITE_DIR, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(categoryPath, file), 'utf-8');
        const scene = JSON.parse(content) as Scene;
        scene.category = category; // ensure category from folder
        scenes.push(scene);
      } catch (e) {
        console.error(`Error loading ${category}/${file}:`, e);
      }
    }
  }

  // Load onboarding scenes
  const onboardingFiles = fs.readdirSync(ONBOARDING_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  for (const file of onboardingFiles) {
    try {
      const content = fs.readFileSync(path.join(ONBOARDING_DIR, file), 'utf-8');
      const scene = JSON.parse(content) as Scene;
      scene.category = 'onboarding';
      scenes.push(scene);
    } catch (e) {
      console.error(`Error loading onboarding/${file}:`, e);
    }
  }

  return scenes;
}

function generateMarkdown(scenes: Scene[]): string {
  // Filter only active scenes
  const activeScenes = scenes.filter(s => s.is_active !== false);

  // Group by category
  const byCategory = new Map<string, Scene[]>();
  for (const scene of activeScenes) {
    const cat = scene.category || 'uncategorized';
    if (!byCategory.has(cat)) {
      byCategory.set(cat, []);
    }
    byCategory.get(cat)!.push(scene);
  }

  // Sort categories
  const sortedCategories = [...byCategory.keys()].sort();

  let md = `# Все сцены (${activeScenes.length} активных)\n\n`;
  md += `Сгенерировано: ${new Date().toISOString().split('T')[0]}\n\n`;
  md += `---\n\n`;

  for (const category of sortedCategories) {
    const catScenes = byCategory.get(category)!;
    // Sort by slug within category
    catScenes.sort((a, b) => a.slug.localeCompare(b.slug));

    md += `## ${category.toUpperCase()} (${catScenes.length})\n\n`;

    for (const scene of catScenes) {
      const title = scene.title?.ru || scene.slug;
      const subtitle = scene.subtitle?.ru || '';
      const desc = scene.user_description?.ru || '';
      const gender = getGenderLabel(scene.for_gender);
      const intensity = scene.intensity || 0;
      const clarification = scene.clarification_for?.join(', ') || '';
      const paired = scene.paired_scene || '';
      const setsGate = scene.sets_gate || '';

      md += `### ${title}\n`;
      md += `**${scene.slug}** | ${gender} | int:${intensity}\n`;
      if (subtitle) {
        md += `*${subtitle}*\n`;
      }
      md += `> ${desc}\n`;
      if (setsGate) {
        md += `> 🔓 sets_gate: \`${setsGate}\`\n`;
      }
      if (clarification) {
        md += `> 📎 clarification_for: \`${clarification}\`\n`;
      }
      if (paired) {
        md += `> 🔗 paired: \`${paired}\`\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  // Summary
  md += `## СТАТИСТИКА\n\n`;

  // By gender
  const byGender = { male: 0, female: 0, null: 0 };
  for (const s of activeScenes) {
    if (s.for_gender === 'male') byGender.male++;
    else if (s.for_gender === 'female') byGender.female++;
    else byGender.null++;
  }
  md += `### По полу\n`;
  md += `- М (male): ${byGender.male}\n`;
  md += `- Ж (female): ${byGender.female}\n`;
  md += `- Все (null): ${byGender.null}\n\n`;

  // By category
  md += `### По категориям\n`;
  for (const cat of sortedCategories) {
    md += `- ${cat}: ${byCategory.get(cat)!.length}\n`;
  }

  return md;
}

async function main() {
  console.log('Loading scenes from JSON files...');
  const scenes = loadAllScenes();
  console.log(`Loaded ${scenes.length} scenes`);

  console.log('Generating markdown...');
  const markdown = generateMarkdown(scenes);

  console.log(`Writing to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');

  console.log('Done!');
}

main().catch(console.error);

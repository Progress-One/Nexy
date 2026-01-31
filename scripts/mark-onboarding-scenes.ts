/**
 * Mark concrete scenes as onboarding (is_onboarding: true)
 *
 * Philosophy: Use CONCRETE scenes, NOT abstract questions.
 * "Минет" instead of "Орал интересно?"
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

interface OnboardingConfig {
  slug: string;
  sets_gate: string;
  onboarding_order: number;
}

// Scenes to mark as onboarding
// Each pair covers both genders viewing the scene
// Slugs taken from actual JSON files
const ONBOARDING_SCENES: OnboardingConfig[] = [
  // ORAL
  { slug: 'blowjob', sets_gate: 'oral', onboarding_order: 1 },              // female sees (gives)
  { slug: 'blowjob-receive', sets_gate: 'oral', onboarding_order: 1 },      // male sees (receives)
  { slug: 'cunnilingus', sets_gate: 'oral', onboarding_order: 2 },          // male sees (gives)
  { slug: 'cunnilingus-receive', sets_gate: 'oral', onboarding_order: 2 },  // female sees (receives)

  // ANAL
  { slug: 'anal-play-on-her', sets_gate: 'anal', onboarding_order: 3 },
  { slug: 'anal-play-on-her-receive', sets_gate: 'anal', onboarding_order: 3 },
  { slug: 'anal-play-on-him', sets_gate: 'anal', onboarding_order: 4 },
  { slug: 'anal-play-on-him-receive', sets_gate: 'anal', onboarding_order: 4 },

  // ROUGH/IMPACT (actual slugs from files)
  { slug: 'spanking-he-spanks-her', sets_gate: 'rough', onboarding_order: 5 },
  { slug: 'spanking-m-to-f-receive', sets_gate: 'rough', onboarding_order: 5 },
  { slug: 'spanking-she-spanks-him', sets_gate: 'rough', onboarding_order: 6 },
  { slug: 'spanking-f-to-m-receive', sets_gate: 'rough', onboarding_order: 6 },

  // BONDAGE (actual slugs from files)
  { slug: 'bondage-he-ties-her', sets_gate: 'bondage', onboarding_order: 7 },
  { slug: 'bondage-he-ties-her-receive', sets_gate: 'bondage', onboarding_order: 7 },
  { slug: 'bondage-she-ties-him', sets_gate: 'bondage', onboarding_order: 8 },
  { slug: 'bondage-she-ties-him-receive', sets_gate: 'bondage', onboarding_order: 8 },

  // ROLEPLAY (actual slugs)
  { slug: 'stranger-roleplay', sets_gate: 'roleplay', onboarding_order: 9 },
  { slug: 'boss-m-secretary-f', sets_gate: 'roleplay', onboarding_order: 10 },
  { slug: 'boss-m-secretary-f-receive', sets_gate: 'roleplay', onboarding_order: 10 },

  // TOYS (actual slugs)
  { slug: 'vibrator-play', sets_gate: 'toys', onboarding_order: 11 },
  { slug: 'cock-ring', sets_gate: 'toys', onboarding_order: 12 },

  // GROUP
  { slug: 'threesome-fmf', sets_gate: 'group', onboarding_order: 13 },
  { slug: 'threesome-mfm', sets_gate: 'group', onboarding_order: 14 },

  // DIRTY TALK
  { slug: 'dirty-talk', sets_gate: 'dirty_talk', onboarding_order: 15 },

  // PRAISE (actual slugs)
  { slug: 'praise-he-praises-her', sets_gate: 'praise', onboarding_order: 16 },
  { slug: 'praise-m-to-f-receive', sets_gate: 'praise', onboarding_order: 16 },
  { slug: 'praise-she-praises-him', sets_gate: 'praise', onboarding_order: 17 },
  { slug: 'praise-f-to-m-receive', sets_gate: 'praise', onboarding_order: 17 },

  // EXHIBITIONISM
  { slug: 'public-sex', sets_gate: 'exhibitionism', onboarding_order: 18 },

  // RECORDING
  { slug: 'filming', sets_gate: 'recording', onboarding_order: 19 },

  // LINGERIE
  { slug: 'lingerie-lace', sets_gate: 'lingerie', onboarding_order: 20 },
];

// Create slug to config map
const onboardingMap = new Map<string, OnboardingConfig>();
for (const config of ONBOARDING_SCENES) {
  onboardingMap.set(config.slug, config);
}

// Find all JSON files recursively
function getAllJsonFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  function scanDir(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory() && !item.name.startsWith('_')) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.json') && item.name !== '_index.json') {
        files.push(fullPath);
      }
    }
  }
  scanDir(dir);
  return files;
}

// Process files
let updated = 0;
let skipped = 0;

const files = getAllJsonFiles(COMPOSITE_DIR);
for (const filePath of files) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);
    const slug = scene.slug || path.basename(filePath, '.json');

    const config = onboardingMap.get(slug);
    if (!config) {
      // Not an onboarding scene - ensure is_onboarding: false
      if (scene.is_onboarding === true) {
        scene.is_onboarding = false;
        delete scene.onboarding_order;
        delete scene.sets_gate;
        fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
        console.log(`[RESET] ${slug} - removed onboarding flags`);
        updated++;
      }
      skipped++;
      continue;
    }

    // Mark as onboarding
    let changed = false;

    if (scene.is_onboarding !== true) {
      scene.is_onboarding = true;
      changed = true;
    }

    if (scene.onboarding_order !== config.onboarding_order) {
      scene.onboarding_order = config.onboarding_order;
      changed = true;
    }

    if (scene.sets_gate !== config.sets_gate) {
      scene.sets_gate = config.sets_gate;
      changed = true;
    }

    // Remove clarification_for - onboarding scenes are main questions
    if (scene.clarification_for) {
      delete scene.clarification_for;
      changed = true;
    }

    // Keep scene_type as is (some may be clarification, some may be undefined)

    if (changed) {
      // Reorder keys for readability
      const ordered = {
        id: scene.id,
        slug: scene.slug,
        version: scene.version,
        scene_type: scene.scene_type,
        sets_gate: scene.sets_gate,
        is_active: scene.is_active,
        is_onboarding: scene.is_onboarding,
        onboarding_order: scene.onboarding_order,
        for_gender: scene.for_gender,
        paired_scene: scene.paired_scene,
        role_direction: scene.role_direction,
        title: scene.title,
        subtitle: scene.subtitle,
        user_description: scene.user_description,
        ai_description: scene.ai_description,
        image_prompt: scene.image_prompt,
        intensity: scene.intensity,
        category: scene.category,
        tags: scene.tags,
        ai_context: scene.ai_context,
        question: scene.question,
      };

      // Remove undefined keys
      const clean = Object.fromEntries(
        Object.entries(ordered).filter(([_, v]) => v !== undefined)
      );

      fs.writeFileSync(filePath, JSON.stringify(clean, null, 2) + '\n');
      console.log(`[UPDATED] ${slug} -> onboarding_order: ${config.onboarding_order}, sets_gate: ${config.sets_gate}`);
      updated++;
    } else {
      console.log(`[OK] ${slug} already configured`);
    }
  } catch (e) {
    console.error(`Failed to process ${filePath}:`, e);
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (not onboarding): ${skipped}`);
console.log(`Total onboarding scenes: ${ONBOARDING_SCENES.length}`);

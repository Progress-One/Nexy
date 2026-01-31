/**
 * Validate scenes against scene-guide-for-humans.md rules
 *
 * Checks:
 * 1. scene_type: should be 'clarification' for non-baseline scenes
 * 2. clarification_for: should contain slugs (not gate names)
 * 3. question.type: if multi_select, must have options
 * 4. for_gender: must be 'male', 'female', or null
 * 5. paired_scene: must point to existing scene with same image_prompt
 * 6. user_description: must be 2nd person ("ты делаешь")
 * 7. question.text: for swipe - statement (no "?"), for multi_select - question
 */
import fs from 'fs';
import path from 'path';

const COMPOSITE_DIR = 'scenes/v2/composite';

// Known gate names (should NOT be in clarification_for)
const GATE_NAMES = new Set([
  'oral', 'anal', 'rough', 'power_dynamic', 'bondage', 'dirty_talk',
  'praise', 'roleplay', 'toys', 'group', 'exhibitionism', 'voyeurism',
  'romantic', 'lingerie', 'foot', 'body_fluids', 'public', 'recording',
  'extreme', 'quickie', 'sexting',
]);

interface ValidationError {
  file: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface Scene {
  slug?: string;
  scene_type?: string;
  clarification_for?: string[];
  for_gender?: string | null;
  paired_scene?: string;
  image_prompt?: string;
  user_description?: { ru?: string; en?: string };
  question?: {
    type?: string;
    text?: { ru?: string; en?: string };
    options?: unknown[];
  };
  is_active?: boolean;
  category?: string;
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

// Load all scenes into memory for cross-reference checks
const allScenes = new Map<string, { scene: Scene; filePath: string }>();
const files = getAllJsonFiles(COMPOSITE_DIR);

for (const filePath of files) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content) as Scene;
    if (scene.slug) {
      allScenes.set(scene.slug, { scene, filePath });
    }
  } catch (e) {
    console.error(`Failed to parse ${filePath}: ${(e as Error).message}`);
  }
}

const errors: ValidationError[] = [];

for (const [slug, { scene, filePath }] of allScenes) {
  const relPath = path.relative(COMPOSITE_DIR, filePath);
  const category = relPath.split(path.sep)[0];

  // Skip inactive scenes
  if (scene.is_active === false) continue;

  // 1. scene_type check
  if (category !== 'baseline' && !scene.scene_type) {
    errors.push({
      file: relPath,
      field: 'scene_type',
      message: 'Non-baseline scene should have scene_type (usually "clarification")',
      severity: 'warning',
    });
  }

  // 2. clarification_for check
  if (scene.clarification_for) {
    for (const item of scene.clarification_for) {
      // If a scene with this slug exists, it's valid (even if it's also a gate name)
      if (allScenes.has(item)) {
        continue; // Valid scene slug
      }

      if (GATE_NAMES.has(item)) {
        errors.push({
          file: relPath,
          field: 'clarification_for',
          message: `Contains gate name "${item}" - should be a scene slug`,
          severity: 'error',
        });
      } else if (!item.includes('-')) {
        // Gate names don't have hyphens, slugs usually do
        errors.push({
          file: relPath,
          field: 'clarification_for',
          message: `"${item}" doesn't look like a scene slug (no hyphens, not found)`,
          severity: 'warning',
        });
      } else {
        // Has hyphens but scene not found
        errors.push({
          file: relPath,
          field: 'clarification_for',
          message: `"${item}" scene not found`,
          severity: 'warning',
        });
      }
    }
  }

  // 3. question.type + options check
  if (scene.question?.type === 'multi_select' && !scene.question.options?.length) {
    errors.push({
      file: relPath,
      field: 'question.options',
      message: 'multi_select requires options array',
      severity: 'error',
    });
  }

  // 4. for_gender check
  if (scene.for_gender !== undefined &&
      scene.for_gender !== null &&
      scene.for_gender !== 'male' &&
      scene.for_gender !== 'female') {
    errors.push({
      file: relPath,
      field: 'for_gender',
      message: `Invalid value "${scene.for_gender}" (must be "male", "female", or null)`,
      severity: 'error',
    });
  }

  // 5. paired_scene check
  if (scene.paired_scene) {
    const paired = allScenes.get(scene.paired_scene);
    if (!paired) {
      errors.push({
        file: relPath,
        field: 'paired_scene',
        message: `Points to non-existent scene "${scene.paired_scene}"`,
        severity: 'error',
      });
    } else {
      // Check image_prompt match
      if (scene.image_prompt && paired.scene.image_prompt &&
          scene.image_prompt !== paired.scene.image_prompt) {
        errors.push({
          file: relPath,
          field: 'image_prompt',
          message: `Differs from paired scene "${scene.paired_scene}"`,
          severity: 'warning',
        });
      }
      // Check bidirectional link
      if (paired.scene.paired_scene !== slug) {
        errors.push({
          file: relPath,
          field: 'paired_scene',
          message: `Not bidirectional (paired scene points to "${paired.scene.paired_scene || 'nothing'}")`,
          severity: 'warning',
        });
      }
    }
  }

  // 6. question.text for swipe should be statement (no ?)
  if (scene.question?.type === 'swipe' || !scene.question?.type) {
    const textRu = scene.question?.text?.ru || '';
    const textEn = scene.question?.text?.en || '';
    if (textRu.includes('?') || textEn.includes('?')) {
      errors.push({
        file: relPath,
        field: 'question.text',
        message: 'Swipe question should be statement (no "?")',
        severity: 'warning',
      });
    }
  }

  // 7. Check for "или" in user_description (should be separate scenes)
  const descRu = scene.user_description?.ru || '';
  if (descRu.includes(' или ') && !descRu.includes('сверху или снизу')) {
    errors.push({
      file: relPath,
      field: 'user_description',
      message: 'Contains "или" - consider splitting into separate scenes',
      severity: 'warning',
    });
  }
}

// Group by severity
const errorsByType = {
  error: errors.filter(e => e.severity === 'error'),
  warning: errors.filter(e => e.severity === 'warning'),
};

console.log('=== VALIDATION RESULTS ===\n');

if (errorsByType.error.length > 0) {
  console.log(`❌ ERRORS (${errorsByType.error.length}):\n`);
  for (const e of errorsByType.error) {
    console.log(`  ${e.file}`);
    console.log(`    ${e.field}: ${e.message}\n`);
  }
}

if (errorsByType.warning.length > 0) {
  console.log(`⚠️ WARNINGS (${errorsByType.warning.length}):\n`);
  for (const e of errorsByType.warning) {
    console.log(`  ${e.file}`);
    console.log(`    ${e.field}: ${e.message}\n`);
  }
}

console.log('=== SUMMARY ===');
console.log(`Total scenes: ${allScenes.size}`);
console.log(`Errors: ${errorsByType.error.length}`);
console.log(`Warnings: ${errorsByType.warning.length}`);

/**
 * Update all composite scenes with for_gender field based on role_direction
 *
 * Mapping:
 * - m_to_f → for_gender: "male" (М видит эту сцену)
 * - f_to_m → for_gender: "female" (Ж видит эту сцену)
 * - mutual, universal → for_gender: null (все видят)
 *
 * Also adds is_onboarding: false explicitly
 *
 * Run: npx tsx scripts/update-scenes-for-gender.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'composite');

interface SceneFile {
  slug: string;
  role_direction?: string;
  for_gender?: string | null;
  is_onboarding?: boolean;
  is_active?: boolean;
  [key: string]: any;
}

function getForGender(roleDirection: string | undefined): 'male' | 'female' | null {
  if (!roleDirection) return null;

  // m_to_f means "male does to female" → shown to male
  if (roleDirection === 'm_to_f') return 'male';

  // f_to_m means "female does to male" → shown to female
  if (roleDirection === 'f_to_m') return 'female';

  // mutual, universal, etc. → shown to everyone
  return null;
}

function processDirectory(dir: string): { updated: number; skipped: number; errors: string[] } {
  const result = { updated: 0, skipped: 0, errors: [] as string[] };

  if (!fs.existsSync(dir)) {
    console.log(`Directory not found: ${dir}`);
    return result;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subResult = processDirectory(fullPath);
      result.updated += subResult.updated;
      result.skipped += subResult.skipped;
      result.errors.push(...subResult.errors);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const scene: SceneFile = JSON.parse(content);

        let modified = false;

        // Add for_gender based on role_direction
        const newForGender = getForGender(scene.role_direction);
        if (scene.for_gender !== newForGender) {
          scene.for_gender = newForGender;
          modified = true;
        }

        // Ensure is_onboarding is explicitly set
        if (scene.is_onboarding === undefined) {
          scene.is_onboarding = false;
          modified = true;
        }

        // Ensure is_active is explicitly set (default true)
        if (scene.is_active === undefined) {
          scene.is_active = true;
          modified = true;
        }

        if (modified) {
          // Write back with proper formatting
          fs.writeFileSync(fullPath, JSON.stringify(scene, null, 2) + '\n');
          console.log(`Updated: ${scene.slug} (role_direction: ${scene.role_direction || 'none'} → for_gender: ${scene.for_gender || 'null'})`);
          result.updated++;
        } else {
          result.skipped++;
        }
      } catch (e) {
        const errorMsg = `Error processing ${fullPath}: ${e}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  }

  return result;
}

async function main() {
  console.log('Updating composite scenes with for_gender field...\n');
  console.log(`Scanning: ${SCENES_DIR}\n`);

  const result = processDirectory(SCENES_DIR);

  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  Updated: ${result.updated}`);
  console.log(`  Skipped (no changes needed): ${result.skipped}`);
  console.log(`  Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error);

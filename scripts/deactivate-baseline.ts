/**
 * Deactivate all baseline scenes (abstract questions)
 *
 * Baseline is deprecated - we use CONCRETE scenes for onboarding instead.
 * Example: "blowjob" instead of "oral-preference?"
 */
import fs from 'fs';
import path from 'path';

const BASELINE_DIR = 'scenes/v2/composite/baseline';

// Get all JSON files in baseline
const files = fs.readdirSync(BASELINE_DIR).filter(f => f.endsWith('.json'));

let deactivated = 0;

for (const file of files) {
  const filePath = path.join(BASELINE_DIR, file);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);

    if (scene.is_active !== false) {
      scene.is_active = false;
      // Add note about deprecation
      scene._deprecated = 'Use concrete scenes with is_onboarding: true instead';

      fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n');
      console.log('[DEACTIVATED]', scene.slug || file);
      deactivated++;
    } else {
      console.log('[ALREADY INACTIVE]', scene.slug || file);
    }
  } catch (e) {
    console.error('Failed to process', file, e);
  }
}

console.log('\n=== SUMMARY ===');
console.log('Deactivated:', deactivated);
console.log('Total files:', files.length);

/**
 * Add sets_gate to scenes that should open gates
 *
 * Run with: npx tsx scripts/add-sets-gate.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SCENES_ROOT = path.join(__dirname, '../scenes/v2');

// Mapping: slug pattern → gate name
const GATE_MAPPING: Record<string, string> = {
  // === ONBOARDING SCENES ===
  // Pattern: onboarding-{topic}-* → {gate}
  'onboarding-anal': 'anal',
  'onboarding-oral': 'oral',
  'onboarding-rough': 'rough',
  'onboarding-bondage': 'bondage',
  'onboarding-power-dom': 'power_dynamic',
  'onboarding-power-sub': 'power_dynamic',
  'onboarding-toys': 'toys',
  'onboarding-roleplay': 'roleplay',
  'onboarding-group': 'group',
  'onboarding-public': 'public',
  'onboarding-exhibitionism': 'exhibitionism',
  'onboarding-dirty-talk': 'dirty_talk',
  'onboarding-praise': 'praise',
  'onboarding-lingerie': 'lingerie',
  'onboarding-foot': 'foot',
  'onboarding-body-fluids': 'body_fluids',
  'onboarding-recording': 'recording',
  'onboarding-romantic': 'romantic',
  'onboarding-quickie': 'quickie',
  'onboarding-sexting': 'sexting',
  'onboarding-extreme': 'extreme',

  // === BASELINE SCENES ===
  'anal-interest': 'anal',
  'oral-preference': 'oral',
  'pain-tolerance': 'rough',
  'toys-interest': 'toys',
  'dirty-talk-interest': 'dirty_talk',
  'power-dynamic': 'power_dynamic',
  'group-interest': 'group',
  'roleplay-interest': 'roleplay',
  'watching-showing': 'exhibitionism',
};

interface SceneFile {
  path: string;
  slug: string;
  data: any;
}

let filesUpdated = 0;
let filesSkipped = 0;

function findGateForSlug(slug: string): string | null {
  // Direct match
  if (GATE_MAPPING[slug]) {
    return GATE_MAPPING[slug];
  }

  // Prefix match (for onboarding-anal-give-m → anal)
  for (const [pattern, gate] of Object.entries(GATE_MAPPING)) {
    if (slug.startsWith(pattern)) {
      return gate;
    }
  }

  return null;
}

function processFile(filePath: string): void {
  if (!filePath.endsWith('.json')) return;
  if (filePath.includes('_archive')) return;
  if (path.basename(filePath).startsWith('_')) return;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scene = JSON.parse(content);

    if (!scene.slug) return;

    const gate = findGateForSlug(scene.slug);

    if (gate) {
      if (scene.sets_gate === gate) {
        // Already has correct gate
        return;
      }

      scene.sets_gate = gate;
      fs.writeFileSync(filePath, JSON.stringify(scene, null, 2) + '\n', 'utf-8');
      filesUpdated++;
      console.log(`✓ ${scene.slug} → sets_gate: "${gate}"`);
    }
  } catch (e) {
    console.error(`Error processing ${filePath}:`, e);
  }
}

function walkDir(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  }
}

console.log('Adding sets_gate to relevant scenes...\n');
walkDir(SCENES_ROOT);

console.log(`\n========================================`);
console.log(`Files updated: ${filesUpdated}`);
console.log(`========================================`);

// Also print summary by gate
console.log('\nGates that can be set:');
const gatesUsed = new Set(Object.values(GATE_MAPPING));
for (const gate of [...gatesUsed].sort()) {
  const scenes = Object.entries(GATE_MAPPING)
    .filter(([_, g]) => g === gate)
    .map(([pattern]) => pattern);
  console.log(`  ${gate}: ${scenes.length} patterns`);
}

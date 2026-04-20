/**
 * Fix clarification_for values to use canonical gate names
 *
 * Problem: clarification_for contains names like 'bondage-give', 'oral-receive'
 * Code expects: canonical gate names like 'bondage', 'oral', 'rough'
 *
 * Run: npx tsx scripts/fix-clarification-for.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'composite');

// Canonical gate names from OnboardingResponses interface
const CANONICAL_GATES = [
  'oral',
  'anal',
  'group',
  'toys',
  'roleplay',
  'quickie',
  'romantic',
  'power_dynamic',
  'rough',
  'public',
  'exhibitionism',
  'recording',
  'dirty_talk',
  'praise',
  'lingerie',
  'foot',
  'bondage',
  'body_fluids',
  'sexting',
  'extreme',
] as const;

// Mapping from detailed names to canonical gate names
const NAME_TO_GATE: Record<string, string> = {
  // Oral variations
  'oral-preference': 'oral',
  'oral-give': 'oral',
  'oral-receive': 'oral',
  'blowjob': 'oral',
  'cunnilingus': 'oral',

  // Anal variations
  'anal-interest': 'anal',
  'anal-give': 'anal',
  'anal-receive': 'anal',

  // Bondage variations
  'bondage-give': 'bondage',
  'bondage-receive': 'bondage',

  // Rough variations
  'rough-give': 'rough',
  'rough-receive': 'rough',
  'pain-tolerance': 'rough',

  // Power dynamic variations
  'power-dom': 'power_dynamic',
  'power-sub': 'power_dynamic',
  'power-dynamic': 'power_dynamic',
  'orgasm-control': 'power_dynamic',
  'free-use': 'power_dynamic',

  // Dirty talk / verbal variations
  'dirty-talk-give': 'dirty_talk',
  'dirty-talk-receive': 'dirty_talk',
  'verbal-preference': 'dirty_talk',
  'degradation': 'dirty_talk',
  'degradation-give': 'dirty_talk',
  'degradation-receive': 'dirty_talk',

  // Praise variations
  'praise-give': 'praise',
  'praise-receive': 'praise',

  // Toys variations
  'toys-interest': 'toys',

  // Exhibitionism variations
  'public': 'public',
  'exhibitionism': 'exhibitionism',

  // Recording variations
  'recording': 'recording',

  // Lingerie variations
  'lingerie': 'lingerie',

  // Foot variations
  'foot-give': 'foot',
  'foot-receive': 'foot',

  // Body fluids variations
  'watersports': 'body_fluids',
  'finish-preference': 'body_fluids',
  'body_fluids': 'body_fluids',

  // Group variations
  'group': 'group',

  // Roleplay variations
  'roleplay': 'roleplay',

  // Romantic variations
  'romantic': 'romantic',
  'foreplay': 'romantic',

  // Other mappings
  'spontaneous': 'quickie',
  'positions': 'romantic', // positions are generally romantic/vanilla
  'sensory': 'romantic',
  'manual': 'romantic',
  'body-fetishes': 'romantic',
  'fantasy-reality': 'roleplay',

  // Extreme is a gate but most extreme scenes also need rough+bondage
  'extreme': 'extreme',
};

interface SceneFile {
  slug: string;
  clarification_for?: string[];
  [key: string]: unknown;
}

interface ProcessResult {
  updated: number;
  skipped: number;
  errors: string[];
  details: {
    mappingsApplied: number;
    unmappedValues: Set<string>;
    scenesAffected: string[];
  };
}

function normalizeToGate(value: string): string | null {
  // Check direct mapping first
  if (NAME_TO_GATE[value]) {
    return NAME_TO_GATE[value];
  }

  // Check if it's already a canonical gate name
  if ((CANONICAL_GATES as readonly string[]).includes(value)) {
    return value;
  }

  // Try to extract base name (e.g., 'oral-give' -> 'oral')
  const baseName = value.replace(/-(give|receive|interest|preference|tolerance)$/, '');
  if ((CANONICAL_GATES as readonly string[]).includes(baseName)) {
    return baseName;
  }

  // Handle underscores (e.g., 'power_dynamic')
  const withUnderscore = baseName.replace(/-/g, '_');
  if ((CANONICAL_GATES as readonly string[]).includes(withUnderscore)) {
    return withUnderscore;
  }

  return null;
}

function processDirectory(dir: string): ProcessResult {
  const result: ProcessResult = {
    updated: 0,
    skipped: 0,
    errors: [],
    details: {
      mappingsApplied: 0,
      unmappedValues: new Set<string>(),
      scenesAffected: [],
    },
  };

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
      result.details.mappingsApplied += subResult.details.mappingsApplied;
      subResult.details.unmappedValues.forEach(v => result.details.unmappedValues.add(v));
      result.details.scenesAffected.push(...subResult.details.scenesAffected);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const scene: SceneFile = JSON.parse(content);

        if (!scene.clarification_for || !Array.isArray(scene.clarification_for)) {
          result.skipped++;
          continue;
        }

        const originalValues = [...scene.clarification_for];
        const newValues: string[] = [];
        let modified = false;

        for (const value of scene.clarification_for) {
          const gate = normalizeToGate(value);

          if (gate) {
            // Avoid duplicates
            if (!newValues.includes(gate)) {
              newValues.push(gate);
            }
            if (value !== gate) {
              result.details.mappingsApplied++;
              modified = true;
            }
          } else {
            // Keep unknown values but log them
            result.details.unmappedValues.add(value);
            if (!newValues.includes(value)) {
              newValues.push(value);
            }
          }
        }

        // Check if the arrays are different (order matters less, but content does)
        const arraysEqual =
          originalValues.length === newValues.length &&
          originalValues.every(v => newValues.includes(normalizeToGate(v) || v));

        if (!arraysEqual || modified) {
          scene.clarification_for = newValues;
          fs.writeFileSync(fullPath, JSON.stringify(scene, null, 2) + '\n');
          console.log(`Updated: ${scene.slug}`);
          console.log(`  Before: [${originalValues.join(', ')}]`);
          console.log(`  After:  [${newValues.join(', ')}]`);
          result.details.scenesAffected.push(scene.slug);
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
  console.log('='.repeat(60));
  console.log('Clarification-For Fix: Normalizing to canonical gate names');
  console.log('='.repeat(60));
  console.log('\nCanonical gate names:');
  console.log(CANONICAL_GATES.join(', '));
  console.log(`\nScanning: ${SCENES_DIR}\n`);

  const result = processDirectory(SCENES_DIR);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Updated files:       ${result.updated}`);
  console.log(`Skipped (no change): ${result.skipped}`);
  console.log(`Errors:              ${result.errors.length}`);
  console.log('\nDetails:');
  console.log(`  Mappings applied:  ${result.details.mappingsApplied}`);
  console.log(`  Scenes affected:   ${result.details.scenesAffected.length}`);

  if (result.details.unmappedValues.size > 0) {
    console.log('\n⚠️  Unmapped values (kept as-is):');
    for (const value of result.details.unmappedValues) {
      console.log(`  - ${value}`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Clarification-for fix complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);

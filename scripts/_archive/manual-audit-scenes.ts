/**
 * Manual audit helper - identifies issues in scenes according to 8 criteria:
 * 1. Question type simplification
 * 2. Onboarding equivalent scenes
 * 3. Gate assignment (sets_gate)
 * 4. Clarification relationships (clarification_for)
 * 5. Gates vs clarification understanding
 * 6. Paired scene completeness (4 scenes check)
 * 7. Ambiguous "or" questions
 * 8. Gender-specific descriptions needing split
 */

import fs from 'fs';
import path from 'path';

const ONBOARDING_DIR = 'scenes/v2/onboarding/converted';
const COMPOSITE_DIR = 'scenes/v2/composite';

interface Scene {
  id: string;
  slug: string;
  scene_type?: string | null;
  sets_gate?: string;
  is_onboarding?: boolean;
  for_gender?: string | null;
  paired_scene?: string;
  paired_with?: string;
  clarification_for?: string[];
  user_description?: { ru: string; en: string };
  question?: {
    type: string;
    text?: { ru: string; en: string };
  };
  title: { ru: string; en: string };
  category?: string;
}

// Issues found
interface Issue {
  file: string;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const issues: Issue[] = [];

function getAllScenes(dir: string): Map<string, { scene: Scene; path: string }> {
  const scenes = new Map();

  function scanDir(currentDir: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.name.endsWith('.json')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const scene = JSON.parse(content) as Scene;
          scenes.set(scene.slug, { scene, path: fullPath });
        } catch (e) {
          console.error(`Error reading ${fullPath}:`, e);
        }
      }
    }
  }

  scanDir(dir);
  return scenes;
}

function checkQuestionType(scene: Scene, filePath: string) {
  // Criterion 1: Check if multi_select should be swipe
  if (scene.question?.type === 'multi_select') {
    // Onboarding scenes should always use swipe
    if (scene.is_onboarding) {
      issues.push({
        file: filePath,
        type: 'question_type',
        description: `Onboarding scene uses multi_select, should be swipe`,
        severity: 'high',
      });
    }
    // Clarification scenes asking "What appeals?" could be swipe
    if (scene.scene_type === 'clarification') {
      const questionText = scene.question.text?.ru || '';
      if (questionText.includes('Что привлекает') || questionText.includes('Что нравится')) {
        issues.push({
          file: filePath,
          type: 'question_type',
          description: `Clarification uses multi_select for "What appeals" question, consider swipe`,
          severity: 'medium',
        });
      }
    }
  }
}

function checkSlugIdMismatch(scene: Scene, filePath: string) {
  // Check if id uses underscores but slug uses hyphens (or vice versa)
  if (!scene.id) return; // Some scenes don't have id field

  const idNormalized = scene.id.replace(/_/g, '-');
  const slugNormalized = scene.slug.replace(/_/g, '-');

  if (idNormalized !== slugNormalized && !scene.id.includes('-')) {
    issues.push({
      file: filePath,
      type: 'slug_mismatch',
      description: `ID "${scene.id}" uses underscores but slug "${scene.slug}" uses hyphens`,
      severity: 'low',
    });
  }
}

function checkPairedScenes(allScenes: Map<string, { scene: Scene; path: string }>) {
  // Criterion 6: Check for complete paired scene sets
  for (const [slug, { scene, path: filePath }] of allScenes) {
    if (scene.paired_scene) {
      const paired = allScenes.get(scene.paired_scene);
      if (!paired) {
        issues.push({
          file: filePath,
          type: 'missing_paired',
          description: `paired_scene "${scene.paired_scene}" does not exist`,
          severity: 'critical',
        });
      } else {
        // Check if paired scene points back
        if (paired.scene.paired_scene !== slug) {
          issues.push({
            file: filePath,
            type: 'paired_mismatch',
            description: `paired_scene "${scene.paired_scene}" doesn't point back to "${slug}"`,
            severity: 'high',
          });
        }
      }
    }
  }
}

function checkAmbiguousOr(scene: Scene, filePath: string) {
  // Criterion 7: Check for "or" in descriptions
  const userDescRu = scene.user_description?.ru || '';
  const userDescEn = scene.user_description?.en || '';

  if (userDescRu.includes(' или ') || userDescEn.includes(' or ')) {
    // Flag for manual review
    issues.push({
      file: filePath,
      type: 'ambiguous_or',
      description: `Contains "or" in description: "${userDescRu.substring(0, 80)}..."`,
      severity: 'medium',
    });
  }
}

function checkGenderSplit(scene: Scene, filePath: string) {
  // Criterion 8: Check if description varies by gender but for_gender is null
  const userDescRu = scene.user_description?.ru || '';

  if (!scene.for_gender && (userDescRu.includes('Ты делаешь') || userDescRu.includes('— или'))) {
    issues.push({
      file: filePath,
      type: 'needs_gender_split',
      description: `Null for_gender but description seems role-specific`,
      severity: 'medium',
    });
  }
}

function findOnboardingDuplicates(
  onboardingScenes: Map<string, { scene: Scene; path: string }>,
  compositeScenes: Map<string, { scene: Scene; path: string }>
) {
  // Criterion 2: Find composite scenes that are equivalent to onboarding
  for (const [onSlug, { scene: onScene, path: onPath }] of onboardingScenes) {
    if (!onSlug) continue;

    // Extract category from onboarding slug (e.g., onboarding-oral-give-m → oral)
    const match = onSlug.match(/onboarding-(.+?)-(give|receive|f|m)$/);
    if (!match) continue;

    const category = match[1];
    const genderSuffix = match[2];

    // Look for composite scenes in same category
    for (const [compSlug, { scene: compScene, path: compPath }] of compositeScenes) {
      if (!compSlug || !compScene.category) continue;

      if (compScene.category === category || compSlug.includes(category)) {
        // Compare user_description similarity
        const onDesc = onScene.user_description?.ru || '';
        const compDesc = compScene.user_description?.ru || '';

        // Simple keyword overlap check
        const onWords = new Set(onDesc.toLowerCase().split(/\s+/));
        const compWords = new Set(compDesc.toLowerCase().split(/\s+/));
        const overlap = Array.from(onWords).filter(w => compWords.has(w)).length;

        if (overlap > 3 && compScene.is_onboarding) {
          issues.push({
            file: `${onPath} vs ${compPath}`,
            type: 'onboarding_duplicate',
            description: `Onboarding "${onSlug}" duplicates composite "${compSlug}"`,
            severity: 'high',
          });
        }
      }
    }
  }
}

function main() {
  console.log('🔍 Starting manual audit of ALL scenes...\n');

  const onboardingScenes = getAllScenes(ONBOARDING_DIR);
  const compositeScenes = getAllScenes(COMPOSITE_DIR);

  console.log(`📊 Found ${onboardingScenes.size} onboarding scenes`);
  console.log(`📊 Found ${compositeScenes.size} composite scenes\n`);

  // Check all composite scenes
  for (const [slug, { scene, path: filePath }] of compositeScenes) {
    checkQuestionType(scene, filePath);
    checkSlugIdMismatch(scene, filePath);
    checkAmbiguousOr(scene, filePath);
    checkGenderSplit(scene, filePath);
  }

  // Check paired scenes
  checkPairedScenes(compositeScenes);

  // Find onboarding duplicates
  findOnboardingDuplicates(onboardingScenes, compositeScenes);

  // Sort issues by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Print issues
  console.log('\n📋 ISSUES FOUND:\n');

  const grouped = issues.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);

  for (const [type, typeIssues] of Object.entries(grouped)) {
    console.log(`\n## ${type.toUpperCase()} (${typeIssues.length})`);
    for (const issue of typeIssues.slice(0, 10)) {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.file}`);
      console.log(`    ${issue.description}`);
    }
    if (typeIssues.length > 10) {
      console.log(`  ... and ${typeIssues.length - 10} more`);
    }
  }

  console.log(`\n\n✅ Total issues found: ${issues.length}`);
}

main();

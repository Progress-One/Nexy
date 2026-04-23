// @ts-nocheck - Legacy one-off seed script; depends on removed @supabase/supabase-js.
/**
 * Seed V2 Data - Load composite scenes and config into Supabase
 *
 * Run: npx tsx supabase/seed-v2-data.ts
 *
 * Requires:
 * - SUPABASE_URL env variable
 * - SUPABASE_SERVICE_ROLE_KEY env variable (not anon key!)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set these environment variables before running');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'composite');
const ONBOARDING_SCENES_DIR = path.join(__dirname, '..', 'scenes', 'v2', 'onboarding', 'converted');
const CONFIG_DIR = path.join(__dirname, '..', 'scenes', 'v2');

interface Scene {
  id: string;
  slug: string;
  version: number;
  role_direction?: string;
  title: { ru: string; en: string };
  subtitle?: { ru: string; en: string };
  description: { ru: string; en: string };
  image_prompt?: string;
  intensity: number;
  category: string;
  tags: string[];
  elements?: any[];
  question?: any;
  ai_context: {
    tests_primary: string[];
    tests_secondary: string[];
  };
  // Paired scene (slug reference, will be resolved to UUID)
  paired_scene?: string;
}

/**
 * Load all scenes from a directory recursively
 */
function loadScenesFromDir(dir: string): Scene[] {
  const scenes: Scene[] = [];

  function loadDir(currentDir: string): void {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        loadDir(fullPath);
      } else if (entry.name.endsWith('.json') && !entry.name.startsWith('_')) {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          scenes.push(content);
        } catch (e) {
          console.error(`Error loading ${fullPath}: ${e}`);
        }
      }
    }
  }

  loadDir(dir);
  return scenes;
}

/**
 * Load all scenes from composite and onboarding directories
 */
function loadAllScenes(): Scene[] {
  const compositeScenes = loadScenesFromDir(SCENES_DIR);
  console.log(`  Loaded ${compositeScenes.length} composite scenes`);

  const onboardingScenes = loadScenesFromDir(ONBOARDING_SCENES_DIR);
  console.log(`  Loaded ${onboardingScenes.length} onboarding scenes`);

  return [...compositeScenes, ...onboardingScenes];
}

/**
 * Load JSON config file
 */
function loadConfig(filename: string): any {
  const filepath = path.join(CONFIG_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`Config file not found: ${filepath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

/**
 * Seed scenes into database using UPSERT to preserve image_url
 */
async function seedScenes(scenes: Scene[]): Promise<void> {
  console.log(`\nSeeding ${scenes.length} scenes...`);

  // First, get existing image_urls to preserve them
  const { data: existingScenes } = await supabase
    .from('scenes')
    .select('slug, image_url')
    .gte('version', 2);

  const existingImageUrls: Record<string, string> = {};
  if (existingScenes) {
    for (const scene of existingScenes) {
      if (scene.image_url) {
        existingImageUrls[scene.slug] = scene.image_url;
      }
    }
  }
  console.log(`  Found ${Object.keys(existingImageUrls).length} existing image URLs to preserve`);

  // Upsert scenes in batches
  const batchSize = 20;
  let upserted = 0;

  for (let i = 0; i < scenes.length; i += batchSize) {
    const batch = scenes.slice(i, i + batchSize).map((scene: any) => ({
      // Identifiers
      slug: scene.slug,
      version: scene.version || 2,
      role_direction: scene.role_direction || 'mutual',
      // Content (localized JSONB)
      title: scene.title,
      subtitle: scene.subtitle || { ru: '', en: '' },
      ai_description: scene.ai_description || { ru: '', en: '' },
      user_description: scene.user_description || scene.ai_description || { ru: '', en: '' },
      // Image - PRESERVE existing image_url if present
      image_url: existingImageUrls[scene.slug] || scene.image_url || '',
      image_prompt: scene.image_prompt || '',
      // Classification
      intensity: scene.intensity,
      category: scene.category,
      tags: scene.tags || [],
      priority: scene.priority || 50,
      // V2 structure
      elements: scene.elements || [],
      question: scene.question || null,
      ai_context: scene.ai_context || { tests_primary: [], tests_secondary: [] },
      // V3 fields
      scene_type: scene.scene_type || null,
      clarification_for: scene.clarification_for || [],
      context: scene.context || 'discovery',
      // Unified scene structure fields
      is_onboarding: scene.is_onboarding || false,
      is_active: scene.is_active !== undefined ? scene.is_active : true,
      for_gender: scene.for_gender || null,
      onboarding_order: scene.onboarding_order || null,
      paired_scene: scene.paired_scene || null,
      sets_gate: scene.sets_gate || null,
    }));

    const { error } = await supabase
      .from('scenes')
      .upsert(batch, { onConflict: 'slug' });

    if (error) {
      console.error(`Error upserting batch ${i / batchSize + 1}:`, error);
    } else {
      upserted += batch.length;
      console.log(`  Upserted ${upserted}/${scenes.length}`);
    }
  }

  console.log(`✓ Seeded ${upserted} scenes (preserved ${Object.keys(existingImageUrls).length} images)`);

  // Resolve paired_scene slugs to paired_with UUIDs
  await resolvePairedScenes();
}

/**
 * Resolve paired_scene (slug) to paired_with (UUID)
 * This runs after all scenes are inserted so we can look up IDs by slug
 */
async function resolvePairedScenes(): Promise<void> {
  console.log('\nResolving paired_scene slugs to UUIDs...');

  // Get all scenes with paired_scene set
  const { data: scenesWithPairs, error: fetchError } = await supabase
    .from('scenes')
    .select('id, slug, paired_scene')
    .not('paired_scene', 'is', null);

  if (fetchError || !scenesWithPairs) {
    console.error('Error fetching scenes with paired_scene:', fetchError);
    return;
  }

  // Get all scenes to build slug->id map
  const { data: allScenes } = await supabase
    .from('scenes')
    .select('id, slug');

  const slugToId = new Map<string, string>();
  for (const scene of allScenes || []) {
    slugToId.set(scene.slug, scene.id);
  }

  // Update paired_with for each scene
  let updated = 0;
  for (const scene of scenesWithPairs) {
    const pairedId = slugToId.get(scene.paired_scene);
    if (pairedId) {
      const { error: updateError } = await supabase
        .from('scenes')
        .update({ paired_with: pairedId })
        .eq('id', scene.id);

      if (!updateError) {
        updated++;
      }
    } else {
      console.warn(`  Warning: paired_scene "${scene.paired_scene}" not found for ${scene.slug}`);
    }
  }

  console.log(`✓ Resolved ${updated}/${scenesWithPairs.length} paired_scene references`);
}

/**
 * Seed discovery configuration
 */
async function seedConfig(configType: string, data: any): Promise<void> {
  if (!data) return;

  console.log(`\nSeeding ${configType}...`);

  // Upsert config
  const { error } = await supabase
    .from('discovery_config')
    .upsert({
      config_type: configType,
      version: data.version || 2,
      data: data,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'config_type,version'
    });

  if (error) {
    console.error(`Error seeding ${configType}:`, error);
  } else {
    console.log(`✓ Seeded ${configType}`);
  }
}

/**
 * Main seed function
 */
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log(' Seeding V2 Discovery Data');
  console.log('='.repeat(50));

  // 1. Load and seed scenes
  const scenes = loadAllScenes();
  console.log(`Loaded ${scenes.length} scenes from ${SCENES_DIR}`);

  if (scenes.length === 0) {
    console.error('No scenes found! Check SCENES_DIR path.');
    process.exit(1);
  }

  await seedScenes(scenes);

  // 2. Load and seed configs
  const flowRules = loadConfig('flow-rules.json');
  await seedConfig('flow_rules', flowRules);

  const profileAnalysis = loadConfig('profile-analysis.json');
  await seedConfig('profile_analysis', profileAnalysis);

  // 3. Load body map if exists
  const bodyMapDir = path.join(CONFIG_DIR, 'body-map');
  if (fs.existsSync(bodyMapDir)) {
    const bodyMapFiles = fs.readdirSync(bodyMapDir).filter(f => f.endsWith('.json'));
    const bodyMapData: any = { activities: {} };

    for (const file of bodyMapFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(bodyMapDir, file), 'utf-8'));
      const activityId = path.basename(file, '.json');
      bodyMapData.activities[activityId] = content;
    }

    await seedConfig('body_map', bodyMapData);
  }

  // 4. Load onboarding categories (paired categories for swipe onboarding)
  const onboardingCategories = loadConfig('onboarding/categories.json');
  if (onboardingCategories) {
    await seedConfig('onboarding_categories', onboardingCategories);
  }

  // 5. Load activities (sounds, clothing)
  const activitiesDir = path.join(CONFIG_DIR, 'activities');
  if (fs.existsSync(activitiesDir)) {
    const activitiesFiles = fs.readdirSync(activitiesDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    const activitiesData: any = { activities: {} };

    for (const file of activitiesFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(activitiesDir, file), 'utf-8'));
      const activityId = path.basename(file, '.json');
      activitiesData.activities[activityId] = content;
    }

    await seedConfig('activities', activitiesData);
  }

  // 6. Summary
  console.log('\n' + '='.repeat(50));
  console.log(' SEED COMPLETE');
  console.log('='.repeat(50));

  // Verify counts
  const { count: sceneCount } = await supabase
    .from('scenes')
    .select('*', { count: 'exact', head: true });

  const { count: configCount } = await supabase
    .from('discovery_config')
    .select('*', { count: 'exact', head: true });

  console.log(`\nDatabase state:`);
  console.log(`  Scenes: ${sceneCount}`);
  console.log(`  Configs: ${configCount}`);
}

main().catch(console.error);

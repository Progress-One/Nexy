/**
 * Create give/receive perspective scenes for all directional scenes
 *
 * For each scene with m_to_f or f_to_m direction:
 * - Creates scene-give (for the person doing the action)
 * - Creates scene-receive (for the person receiving)
 * - Both share the same image_variants
 * - Uses manually written descriptions from perspective-descriptions.json
 *
 * Run: npx tsx scripts/create-perspective-scenes.ts
 * Options:
 *   --dry-run    Show what would be created without making changes
 *   --category=X Only process scenes in category X
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Scene {
  id: string;
  slug: string;
  category: string;
  role_direction: string;
  title: { ru: string; en: string };
  subtitle: { ru: string; en: string } | null;
  user_description: { ru: string; en: string } | null;
  ai_description: { ru: string; en: string };
  image_url: string | null;
  image_prompt: string | null;
  generation_prompt: string | null;
  image_variants: unknown[] | null;
  tags: string[];
  elements: string[];
  intensity: number;
  version: number;
  is_active: boolean;
  ai_context: unknown;
}

interface PerspectiveDesc {
  ru: string;
  en: string;
  for: 'M' | 'F';
}

interface PerspectiveEntry {
  original: string;
  give: PerspectiveDesc;
  receive: PerspectiveDesc;
}

type PerspectiveDescriptions = Record<string, PerspectiveEntry>;

// Load perspective descriptions from JSON
function loadDescriptions(): PerspectiveDescriptions {
  const jsonPath = path.join(__dirname, 'data', 'perspective-descriptions.json');
  const content = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content);
}

// Find matching description key for a scene slug
function findDescriptionKey(slug: string, descriptions: PerspectiveDescriptions): string | null {
  // Direct match
  if (descriptions[slug]) {
    return slug;
  }

  // Try common transformations
  const normalized = slug
    .replace(/^v2-/, '')
    .replace(/-m-to-f$/, '')
    .replace(/-f-to-m$/, '')
    .replace(/-hetero$/, '');

  if (descriptions[normalized]) {
    return normalized;
  }

  // Try partial match - find key that is a substring of slug or vice versa
  for (const key of Object.keys(descriptions)) {
    const normalizedKey = key.replace(/-/g, '');
    const normalizedSlug = normalized.replace(/-/g, '');

    if (normalizedSlug.includes(normalizedKey) || normalizedKey.includes(normalizedSlug)) {
      return key;
    }
  }

  return null;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const categoryArg = process.argv.find(a => a.startsWith('--category='));
  const categoryFilter = categoryArg ? categoryArg.split('=')[1] : null;

  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Load descriptions
  console.log('Loading perspective descriptions...');
  const descriptions = loadDescriptions();
  console.log(`Loaded ${Object.keys(descriptions).length} description entries\n`);

  console.log('Fetching directional scenes...\n');

  // Build query
  let query = supabase
    .from('scenes')
    .select('*')
    .eq('version', 2)
    .neq('category', 'onboarding')
    .in('role_direction', ['m_to_f', 'f_to_m']);

  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
    console.log(`Filtering by category: ${categoryFilter}\n`);
  }

  const { data: scenes, error } = await query.order('category').order('slug');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!scenes || scenes.length === 0) {
    console.log('No scenes found.');
    return;
  }

  console.log(`Found ${scenes.length} scenes to process.\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let noDescCount = 0;

  for (const scene of scenes as Scene[]) {
    const dir = scene.role_direction;
    const giverGender = dir === 'm_to_f' ? 'M' : 'F';
    const receiverGender = dir === 'm_to_f' ? 'F' : 'M';

    // Find description in JSON
    const descKey = findDescriptionKey(scene.slug, descriptions);
    const descEntry = descKey ? descriptions[descKey] : null;

    // Check if perspectives already exist
    const giveSlug = `${scene.slug}-give`;
    const receiveSlug = `${scene.slug}-receive`;

    const { data: existing } = await supabase
      .from('scenes')
      .select('slug')
      .in('slug', [giveSlug, receiveSlug]);

    const existingSlugs = (existing || []).map(s => s.slug);

    console.log(`\n${scene.slug} (${dir})`);
    if (descKey) {
      console.log(`  Matched description: ${descKey}`);
    } else {
      console.log(`  WARNING: No description found in JSON`);
      noDescCount++;
    }

    // Create GIVE scene
    if (!existingSlugs.includes(giveSlug)) {
      // Use description from JSON or fall back to original
      let giveDesc: { ru: string; en: string } | null = null;

      if (descEntry) {
        giveDesc = {
          ru: descEntry.give.ru,
          en: descEntry.give.en,
        };
      } else if (scene.user_description) {
        // Fallback: use original description
        giveDesc = scene.user_description;
      }

      const giveScene = {
        slug: giveSlug,
        category: scene.category,
        role_direction: scene.role_direction,
        title: scene.title,
        subtitle: scene.subtitle,
        user_description: giveDesc,
        ai_description: scene.ai_description,
        image_url: scene.image_url,
        image_prompt: scene.image_prompt,
        generation_prompt: scene.generation_prompt,
        image_variants: scene.image_variants,
        tags: [...(scene.tags || []), 'give', `for_${giverGender.toLowerCase()}`],
        elements: scene.elements,
        intensity: scene.intensity,
        version: 2,
        is_active: scene.is_active,
        ai_context: scene.ai_context,
      };

      if (!isDryRun) {
        const { error: insertError } = await supabase.from('scenes').insert(giveScene);
        if (insertError) {
          console.log(`  ERROR creating ${giveSlug}: ${insertError.message}`);
          errorCount++;
        } else {
          console.log(`  Created: ${giveSlug} (for ${giverGender})`);
          createdCount++;
        }
      } else {
        console.log(`  Would create: ${giveSlug} (for ${giverGender})`);
        console.log(`    Desc: ${giveDesc?.ru?.slice(0, 60)}...`);
        createdCount++;
      }
    } else {
      console.log(`  Skip: ${giveSlug} (already exists)`);
      skippedCount++;
    }

    // Create RECEIVE scene
    if (!existingSlugs.includes(receiveSlug)) {
      // Use description from JSON or fall back to original
      let receiveDesc: { ru: string; en: string } | null = null;

      if (descEntry) {
        receiveDesc = {
          ru: descEntry.receive.ru,
          en: descEntry.receive.en,
        };
      } else if (scene.user_description) {
        // Fallback: use original description
        receiveDesc = scene.user_description;
      }

      const receiveScene = {
        slug: receiveSlug,
        category: scene.category,
        role_direction: scene.role_direction,
        title: scene.title,
        subtitle: scene.subtitle,
        user_description: receiveDesc,
        ai_description: scene.ai_description,
        image_url: scene.image_url,
        image_prompt: scene.image_prompt,
        generation_prompt: scene.generation_prompt,
        image_variants: scene.image_variants,
        tags: [...(scene.tags || []), 'receive', `for_${receiverGender.toLowerCase()}`],
        elements: scene.elements,
        intensity: scene.intensity,
        version: 2,
        is_active: scene.is_active,
        ai_context: scene.ai_context,
      };

      if (!isDryRun) {
        const { error: insertError } = await supabase.from('scenes').insert(receiveScene);
        if (insertError) {
          console.log(`  ERROR creating ${receiveSlug}: ${insertError.message}`);
          errorCount++;
        } else {
          console.log(`  Created: ${receiveSlug} (for ${receiverGender})`);
          createdCount++;
        }
      } else {
        console.log(`  Would create: ${receiveSlug} (for ${receiverGender})`);
        console.log(`    Desc: ${receiveDesc?.ru?.slice(0, 60)}...`);
        createdCount++;
      }
    } else {
      console.log(`  Skip: ${receiveSlug} (already exists)`);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Created: ${createdCount} scenes`);
  console.log(`Skipped: ${skippedCount} (already exist)`);
  console.log(`Errors: ${errorCount}`);
  console.log(`No description in JSON: ${noDescCount} scenes`);

  if (isDryRun) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch(console.error);

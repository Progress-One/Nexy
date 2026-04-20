import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface SceneSpec {
  slug: string;
  tags: string[];
  category: string;
  intensity?: number;
  ai_context?: {
    tests_primary?: string[];
    tests_secondary?: string[];
  };
}

interface Discrepancy {
  slug: string;
  field: string;
  db_value: any;
  spec_value: any;
  severity: 'high' | 'medium' | 'low';
}

// Load all JSON specs from scenes/v2/composite
function loadJsonSpecs(basePath: string): Map<string, SceneSpec> {
  const specs = new Map<string, SceneSpec>();

  function walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          if (content.slug && content.tags) {
            specs.set(content.slug, {
              slug: content.slug,
              tags: content.tags,
              category: content.category,
              intensity: content.intensity,
              ai_context: content.ai_context
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  walkDir(basePath);
  return specs;
}

// Find matching spec for a scene (by slug base or category)
function findMatchingSpec(slug: string, category: string, specs: Map<string, SceneSpec>): SceneSpec | null {
  // Direct match
  if (specs.has(slug)) {
    return specs.get(slug)!;
  }

  // Try base slug (remove -give, -receive, -hetero-m, -hetero-f, etc.)
  const baseSlug = slug
    .replace(/-give$/, '')
    .replace(/-receive$/, '')
    .replace(/-hetero-[mf]$/, '')
    .replace(/-she-wears$/, '')
    .replace(/-he-wears$/, '')
    .replace(/-she-for-him$/, '')
    .replace(/-he-for-her$/, '')
    .replace(/-he-on-her$/, '')
    .replace(/-she-on-him$/, '')
    .replace(/-on-self$/, '')
    .replace(/-he-sucks-hers$/, '')
    .replace(/-she-sucks-his$/, '');

  if (specs.has(baseSlug)) {
    return specs.get(baseSlug)!;
  }

  // Try category match
  for (const [specSlug, spec] of specs) {
    if (spec.category === category && slug.includes(specSlug.split('-')[0])) {
      return spec;
    }
  }

  return null;
}

async function run() {
  console.log('Loading JSON specs from scenes/v2/composite...\n');
  const specsPath = path.join(__dirname, '..', 'scenes', 'v2', 'composite');
  const specs = loadJsonSpecs(specsPath);
  console.log(`Loaded ${specs.size} JSON specs\n`);

  console.log('Fetching all scenes from DB...\n');
  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('slug, category, tags, intensity, ai_context, title, subtitle, is_active')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  if (error) {
    console.error('Error fetching scenes:', error.message);
    return;
  }

  console.log(`Found ${scenes?.length} active scenes\n`);

  const discrepancies: Discrepancy[] = [];
  const noSpec: string[] = [];
  const missingFields: string[] = [];

  for (const scene of scenes || []) {
    const spec = findMatchingSpec(scene.slug, scene.category, specs);

    if (!spec) {
      noSpec.push(`${scene.slug} (category: ${scene.category})`);
      continue;
    }

    // Check tags[0] (primary tag for gates)
    const dbPrimaryTag = scene.tags?.[0];
    const specPrimaryTag = spec.tags?.[0];
    if (dbPrimaryTag !== specPrimaryTag) {
      discrepancies.push({
        slug: scene.slug,
        field: 'tags[0] (primary)',
        db_value: dbPrimaryTag,
        spec_value: specPrimaryTag,
        severity: 'high'
      });
    }

    // Check if all spec tags are in DB tags
    const dbTags = new Set(scene.tags || []);
    for (const specTag of spec.tags) {
      if (!dbTags.has(specTag)) {
        discrepancies.push({
          slug: scene.slug,
          field: 'missing tag',
          db_value: Array.from(dbTags),
          spec_value: specTag,
          severity: 'medium'
        });
      }
    }

    // Check category match
    if (scene.category !== spec.category) {
      discrepancies.push({
        slug: scene.slug,
        field: 'category',
        db_value: scene.category,
        spec_value: spec.category,
        severity: 'high'
      });
    }

    // Check missing fields
    if (!scene.title || (typeof scene.title === 'object' && !scene.title.ru)) {
      missingFields.push(`${scene.slug}: missing title`);
    }
    if (!scene.subtitle || (typeof scene.subtitle === 'object' && !scene.subtitle.ru)) {
      missingFields.push(`${scene.slug}: missing subtitle`);
    }
    if (!scene.intensity) {
      missingFields.push(`${scene.slug}: missing intensity`);
    }
    if (!scene.ai_context || !scene.ai_context.tests_primary) {
      missingFields.push(`${scene.slug}: missing ai_context`);
    }
  }

  // Output report
  console.log('=' .repeat(60));
  console.log('AUDIT REPORT');
  console.log('='.repeat(60));

  if (discrepancies.length > 0) {
    console.log('\n## TAG/CATEGORY DISCREPANCIES\n');

    const highSeverity = discrepancies.filter(d => d.severity === 'high');
    const mediumSeverity = discrepancies.filter(d => d.severity === 'medium');

    if (highSeverity.length > 0) {
      console.log('### HIGH SEVERITY (affects gates/filtering):\n');
      for (const d of highSeverity) {
        console.log(`- ${d.slug}`);
        console.log(`  ${d.field}: DB="${d.db_value}" vs SPEC="${d.spec_value}"`);
      }
    }

    if (mediumSeverity.length > 0) {
      console.log('\n### MEDIUM SEVERITY (missing tags):\n');
      const bySlug = new Map<string, string[]>();
      for (const d of mediumSeverity) {
        if (!bySlug.has(d.slug)) bySlug.set(d.slug, []);
        bySlug.get(d.slug)!.push(d.spec_value);
      }
      for (const [slug, tags] of bySlug) {
        console.log(`- ${slug}: missing [${tags.join(', ')}]`);
      }
    }
  }

  if (missingFields.length > 0) {
    console.log('\n## MISSING FIELDS\n');
    // Group by field type
    const byField = new Map<string, string[]>();
    for (const mf of missingFields) {
      const [slug, field] = mf.split(': ');
      if (!byField.has(field)) byField.set(field, []);
      byField.get(field)!.push(slug);
    }
    for (const [field, slugs] of byField) {
      console.log(`### ${field} (${slugs.length} scenes):`);
      console.log(slugs.slice(0, 10).join(', ') + (slugs.length > 10 ? ` ... and ${slugs.length - 10} more` : ''));
    }
  }

  if (noSpec.length > 0) {
    console.log('\n## SCENES WITHOUT JSON SPEC\n');
    console.log(`${noSpec.length} scenes have no matching JSON specification:`);
    console.log(noSpec.slice(0, 20).join('\n') + (noSpec.length > 20 ? `\n... and ${noSpec.length - 20} more` : ''));
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total active scenes: ${scenes?.length}`);
  console.log(`JSON specs loaded: ${specs.size}`);
  console.log(`Tag/category discrepancies: ${discrepancies.length}`);
  console.log(`Scenes without spec: ${noSpec.length}`);
  console.log(`Missing fields: ${missingFields.length}`);
}

run();

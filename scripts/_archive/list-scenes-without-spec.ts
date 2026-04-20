import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function getJsonSlugs(dir: string): Set<string> {
  const slugs = new Set<string>();

  function walk(d: string) {
    const files = fs.readdirSync(d);
    for (const file of files) {
      const full = path.join(d, file);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (file.endsWith('.json')) {
        try {
          const content = JSON.parse(fs.readFileSync(full, 'utf-8'));
          if (content.slug) slugs.add(content.slug);
        } catch {}
      }
    }
  }

  walk(dir);
  return slugs;
}

async function run() {
  const jsonSlugs = getJsonSlugs('./scenes/v2/composite');

  const { data: scenes } = await supabase
    .from('scenes')
    .select('slug, category')
    .eq('is_active', true)
    .order('category')
    .order('slug');

  const noSpec: Record<string, string[]> = {};

  for (const s of scenes || []) {
    const baseSlug = s.slug
      .replace(/-give$/, '').replace(/-receive$/, '')
      .replace(/-hetero-[mf]$/, '')
      .replace(/-[mf]-to-[mf]$/, '')
      .replace(/-she-wears$/, '').replace(/-he-wears$/, '')
      .replace(/-she-for-him$/, '').replace(/-he-for-her$/, '')
      .replace(/-he-on-her$/, '').replace(/-she-on-him$/, '')
      .replace(/-on-self$/, '')
      .replace(/-he-sucks-hers$/, '').replace(/-she-sucks-his$/, '');

    if (!jsonSlugs.has(s.slug) && !jsonSlugs.has(baseSlug)) {
      if (!noSpec[s.category]) noSpec[s.category] = [];
      noSpec[s.category].push(s.slug);
    }
  }

  for (const [cat, slugs] of Object.entries(noSpec).sort()) {
    console.log(`\n## ${cat} (${slugs.length})`);
    slugs.forEach(s => console.log(`  - ${s}`));
  }

  console.log(`\n\nTotal: ${Object.values(noSpec).flat().length} scenes without JSON spec`);
}

run();

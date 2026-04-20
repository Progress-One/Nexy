/**
 * Copy images from one scene to others
 * Run: npx dotenv-cli -e .env.local -- npx tsx scripts/copy-images.ts <from-slug> <to-slugs...>
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function copyImages(fromSlug: string, toSlugs: string[]) {
  console.log(`Copying images from "${fromSlug}" to:`, toSlugs);

  // Get source scene
  const { data: source, error: sourceError } = await supabase
    .from('scenes')
    .select('slug, image_url, image_variants')
    .eq('slug', fromSlug)
    .single();

  if (sourceError || !source) {
    console.error(`Source scene "${fromSlug}" not found:`, sourceError);
    return;
  }

  console.log(`\nSource "${fromSlug}":`);
  console.log(`  image_url: ${source.image_url || 'null'}`);
  console.log(`  variants: ${source.image_variants ? source.image_variants.length + ' images' : 'null'}`);
  if (source.image_variants?.length) {
    const v = source.image_variants[0];
    console.log(`  first variant: ${typeof v === 'string' ? v.substring(0, 80) : JSON.stringify(v).substring(0, 80)}...`);
  }

  if (!source.image_url && !source.image_variants?.length) {
    console.log('\nNo images to copy');
    return;
  }

  console.log('\nCopying...');

  // Update target scenes
  for (const slug of toSlugs) {
    const { error: updateError } = await supabase
      .from('scenes')
      .update({
        image_url: source.image_url,
        image_variants: source.image_variants
      })
      .eq('slug', slug);

    if (updateError) {
      console.error(`✗ ${slug}:`, updateError.message);
    } else {
      console.log(`✓ ${slug}`);
    }
  }

  console.log('\nDone!');
}

const [fromSlug, ...toSlugs] = process.argv.slice(2);

if (!fromSlug || toSlugs.length === 0) {
  console.log('Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/copy-images.ts <from-slug> <to-slugs...>');
  console.log('Example: npx dotenv-cli -e .env.local -- npx tsx scripts/copy-images.ts ice-play ice-play-on-her ice-play-on-him');
  process.exit(1);
}

copyImages(fromSlug, toSlugs);

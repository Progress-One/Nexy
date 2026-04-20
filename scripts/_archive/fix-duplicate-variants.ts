/**
 * Fix duplicate URLs in image_variants
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
}

async function main() {
  console.log('Checking for duplicate URLs in image_variants...\n');

  const { data: scenes, error } = await supabase
    .from('scenes')
    .select('id, slug, image_variants')
    .not('image_variants', 'is', null);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  let fixed = 0;

  // Helper to get URL without query string
  const getBaseUrl = (url: string) => url.split('?')[0];

  for (const scene of scenes || []) {
    const variants: ImageVariant[] = scene.image_variants || [];
    if (variants.length === 0) continue;

    // Check for duplicates (compare without query params like ?t=)
    const seen = new Set<string>();
    const unique: ImageVariant[] = [];
    let hasDuplicates = false;

    for (const v of variants) {
      const baseUrl = getBaseUrl(v.url);
      if (!seen.has(baseUrl)) {
        seen.add(baseUrl);
        unique.push(v);
      } else {
        hasDuplicates = true;
      }
    }

    if (hasDuplicates) {
      console.log(`${scene.slug}: ${variants.length} -> ${unique.length} variants`);

      const { error: updateError } = await supabase
        .from('scenes')
        .update({ image_variants: unique })
        .eq('id', scene.id);

      if (updateError) {
        console.log(`  Error: ${updateError.message}`);
      } else {
        fixed++;
      }
    }
  }

  console.log(`\nFixed ${fixed} scenes with duplicate variants`);
}

main().catch(console.error);

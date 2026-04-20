import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Get all scenes that might be oral/cunnilingus related
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, category, image_url, shared_images_with, image_variants')
    .or('slug.ilike.%oral%,slug.ilike.%cunnilingus%,slug.ilike.%blowjob%,slug.ilike.%worship%,category.eq.oral');

  // Build a map of id -> slug for lookups
  const idToSlug: Record<string, string> = {};
  for (const s of scenes || []) {
    idToSlug[s.id] = s.slug;
  }

  console.log('Oral/Cunnilingus scenes sharing status:\n');

  for (const s of scenes || []) {
    const hasImage = !!s.image_url;
    const hasVariants = (s.image_variants?.length || 0) > 0;
    const sharedFrom = s.shared_images_with ? idToSlug[s.shared_images_with] || s.shared_images_with : null;

    console.log(`${s.slug}:`);
    console.log(`  category: ${s.category || 'none'}`);
    console.log(`  has_image: ${hasImage}`);
    console.log(`  has_variants: ${hasVariants} (${s.image_variants?.length || 0})`);
    console.log(`  shared_from: ${sharedFrom || 'none'}`);
    console.log();
  }
}

check();

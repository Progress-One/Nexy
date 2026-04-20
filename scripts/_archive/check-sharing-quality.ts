import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  // Get all scenes
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, category, image_url, shared_images_with, image_variants');

  if (!scenes) return;

  // Build maps
  const idToScene: Record<string, typeof scenes[0]> = {};
  for (const s of scenes) {
    idToScene[s.id] = s;
  }

  console.log('=== Scenes with shared_images_with ===\n');

  // Find scenes that share from others
  const sharingScenes = scenes.filter(s => s.shared_images_with);

  for (const s of sharingScenes) {
    const source = idToScene[s.shared_images_with];
    if (!source) {
      console.log(`${s.slug}: source not found!`);
      continue;
    }

    const sourceVariants = source.image_variants?.filter((v: any) => !v.is_placeholder)?.length || 0;
    const hasSourceImage = source.image_url ? 1 : 0;
    const effectiveCount = Math.max(sourceVariants, hasSourceImage);

    // Flag if source has few images
    const flag = effectiveCount <= 1 ? ' ⚠️ LOW' : '';

    console.log(`${s.slug}:`);
    console.log(`  shares from: ${source.slug}`);
    console.log(`  source has: ${sourceVariants} variants + ${hasSourceImage} image_url = ${effectiveCount} effective${flag}`);
    console.log();
  }

  // Find potential better sources (scenes with many variants in same category)
  console.log('\n=== Scenes with most variants (potential sources) ===\n');

  const withVariants = scenes
    .filter(s => (s.image_variants?.length || 0) > 2)
    .sort((a, b) => (b.image_variants?.length || 0) - (a.image_variants?.length || 0));

  for (const s of withVariants.slice(0, 20)) {
    const variantCount = s.image_variants?.filter((v: any) => !v.is_placeholder)?.length || 0;
    console.log(`${s.slug} (${s.category}): ${variantCount} variants`);
  }
}

check();

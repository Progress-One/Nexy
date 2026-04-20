import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Pairs to link (scenes that should share images)
const pairsToLink = [
  // Collar scenes
  ['collar-he-owns-her', 'collar-she-owns-him'],
  ['collar-he-owns-her-give', 'collar-she-owns-him-give'],
  ['collar-he-owns-her-receive', 'collar-she-owns-him-receive'],
  // Lingerie scenes
  ['female-lingerie', 'male-lingerie'],
  ['female-lingerie-give', 'male-lingerie-give'],
  ['female-lingerie-receive', 'male-lingerie-receive'],
];

async function linkPairs() {
  console.log('=== LINKING DISCOVERY SCENE PAIRS ===\n');

  for (const [slugA, slugB] of pairsToLink) {
    // Get both scenes
    const { data: scenes } = await supabase
      .from('scenes')
      .select('id, slug, image_url, image_variants, shared_images_with')
      .in('slug', [slugA, slugB]);

    if (!scenes || scenes.length !== 2) {
      console.log(`❌ ${slugA} ↔ ${slugB}: Not found (found ${scenes?.length || 0})`);
      continue;
    }

    const sceneA = scenes.find(s => s.slug === slugA)!;
    const sceneB = scenes.find(s => s.slug === slugB)!;

    // Check if already linked
    if (sceneA.shared_images_with || sceneB.shared_images_with) {
      console.log(`⏭ ${slugA} ↔ ${slugB}: Already has shared_images_with`);
      continue;
    }

    // Determine source (scene with more variants or image)
    const aVariants = (sceneA.image_variants as any[] || []).length;
    const bVariants = (sceneB.image_variants as any[] || []).length;
    const aHasImage = !!sceneA.image_url;
    const bHasImage = !!sceneB.image_url;

    let source, target;
    if (aVariants > bVariants) {
      source = sceneA;
      target = sceneB;
    } else if (bVariants > aVariants) {
      source = sceneB;
      target = sceneA;
    } else if (aHasImage && !bHasImage) {
      source = sceneA;
      target = sceneB;
    } else {
      // Default: first one is source
      source = sceneA;
      target = sceneB;
    }

    // Link target to source
    const { error } = await supabase
      .from('scenes')
      .update({ shared_images_with: source.id })
      .eq('id', target.id);

    if (error) {
      console.log(`❌ ${slugA} ↔ ${slugB}: Error - ${error.message}`);
    } else {
      console.log(`✅ ${target.slug} → ${source.slug} (source has ${Math.max(aVariants, bVariants)} variants)`);
    }
  }

  console.log('\n=== DONE ===');
}

linkPairs();

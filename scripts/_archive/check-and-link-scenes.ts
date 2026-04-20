import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Scenes to check from screenshots
const scenePairs = [
  { pattern: 'collar', category: 'control-power' },
  { pattern: 'pegging', category: 'anal' },
  { pattern: 'cumshot', category: 'body-fluids' },
  { pattern: 'squirt', category: 'body-fluids' },
  { pattern: 'lingerie', category: 'clothing' },
];

async function checkAndLink() {
  console.log('=== CHECKING SCENES FOR LINKING ===\n');

  // First, let's find all relevant scenes
  const { data: allScenes } = await supabase
    .from('scenes')
    .select('id, slug, title, category, role_direction, shared_images_with, paired_with, image_url, image_variants')
    .or('slug.ilike.%collar%,slug.ilike.%pegging%,slug.ilike.%cumshot%,slug.ilike.%squirt%,slug.ilike.%lingerie%,title->>ru.ilike.%ошейник%,title->>ru.ilike.%сквирт%,title->>ru.ilike.%кончать%,title->>ru.ilike.%бельё%')
    .order('category')
    .order('slug');

  if (!allScenes || allScenes.length === 0) {
    console.log('No scenes found');
    return;
  }

  console.log(`Found ${allScenes.length} scenes:\n`);

  // Group by approximate topic
  const groups: Record<string, typeof allScenes> = {};

  for (const scene of allScenes) {
    const slug = scene.slug?.toLowerCase() || '';
    const titleRu = (scene.title as any)?.ru?.toLowerCase() || '';

    let key = 'other';
    if (slug.includes('collar') || titleRu.includes('ошейник')) key = 'collar';
    else if (slug.includes('pegging')) key = 'pegging';
    else if (slug.includes('cumshot') || titleRu.includes('кончать')) key = 'cumshot';
    else if (slug.includes('squirt') || titleRu.includes('сквирт')) key = 'squirt';
    else if (slug.includes('lingerie') || titleRu.includes('бельё')) key = 'lingerie';

    if (!groups[key]) groups[key] = [];
    groups[key].push(scene);
  }

  // Print grouped scenes
  for (const [group, scenes] of Object.entries(groups)) {
    if (group === 'other') continue;

    console.log(`\n=== ${group.toUpperCase()} ===`);
    for (const s of scenes) {
      const hasVariants = s.image_variants && (s.image_variants as any[]).length > 0;
      const variantCount = hasVariants ? (s.image_variants as any[]).length : 0;
      console.log(`  ${s.slug}`);
      console.log(`    category: ${s.category}, direction: ${s.role_direction}`);
      console.log(`    shared_images_with: ${s.shared_images_with || 'null'}`);
      console.log(`    paired_with: ${s.paired_with || 'null'}`);
      console.log(`    variants: ${variantCount}, has_image: ${!!s.image_url}`);
    }

    // Check if linking needed
    if (scenes.length === 2) {
      const [a, b] = scenes;
      if (!a.shared_images_with && !b.shared_images_with) {
        // Find which has more variants
        const aVariants = (a.image_variants as any[] || []).length;
        const bVariants = (b.image_variants as any[] || []).length;
        const source = aVariants >= bVariants ? a : b;
        const target = aVariants >= bVariants ? b : a;

        console.log(`\n  → SHOULD LINK: ${target.slug} → ${source.slug} (source has ${Math.max(aVariants, bVariants)} variants)`);
      } else {
        console.log(`\n  → Already linked or partially linked`);
      }
    }
  }
}

checkAndLink();

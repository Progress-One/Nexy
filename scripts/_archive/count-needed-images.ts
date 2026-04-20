import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function count() {
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, slug, category, image_url, image_variants, paired_with, shared_images_with, is_active, accepted');

  if (!scenes) {
    console.log('No scenes found');
    return;
  }

  const byId: Record<string, typeof scenes[0]> = {};
  scenes.forEach(s => byId[s.id] = s);

  // Find unique "image groups" - scenes that share the same image
  const processed = new Set<string>();
  const imageGroups: {
    primary: string;
    members: string[];
    hasImage: boolean;
    isActive: boolean;
    category: string;
  }[] = [];

  for (const scene of scenes) {
    if (processed.has(scene.id)) continue;

    // Collect all scenes in this group
    const group = new Set<string>([scene.id]);

    // Add paired scene
    if (scene.paired_with && byId[scene.paired_with]) {
      group.add(scene.paired_with);
    }

    // Add shared_images_with scene
    if (scene.shared_images_with && byId[scene.shared_images_with]) {
      group.add(scene.shared_images_with);
      // Also add that scene's paired
      const shared = byId[scene.shared_images_with];
      if (shared.paired_with && byId[shared.paired_with]) {
        group.add(shared.paired_with);
      }
    }

    // Check reverse links too
    for (const s of scenes) {
      if (s.paired_with === scene.id || s.shared_images_with === scene.id) {
        group.add(s.id);
        if (s.paired_with && byId[s.paired_with]) group.add(s.paired_with);
        if (s.shared_images_with && byId[s.shared_images_with]) group.add(s.shared_images_with);
      }
    }

    // Mark all as processed
    group.forEach(id => processed.add(id));

    // Check if any scene in group has image
    const members = Array.from(group);
    const hasImage = members.some(id => {
      const s = byId[id];
      return s.image_url || (s.image_variants && s.image_variants.length > 0);
    });

    // Check if any is active
    const isActive = members.some(id => byId[id].is_active !== false);

    imageGroups.push({
      primary: scene.slug,
      members: members.map(id => byId[id].slug),
      hasImage,
      isActive,
      category: scene.category,
    });
  }

  // Stats
  const totalGroups = imageGroups.length;
  const activeGroups = imageGroups.filter(g => g.isActive);
  const withImage = activeGroups.filter(g => g.hasImage);
  const needImage = activeGroups.filter(g => !g.hasImage);

  console.log('=== СТАТИСТИКА КАРТИНОК ===\n');
  console.log(`Всего сцен в БД: ${scenes.length}`);
  console.log(`Уникальных групп картинок: ${totalGroups}`);
  console.log(`  (сцены с paired_with/shared_images_with считаются как одна группа)\n`);

  console.log(`Активных групп (is_active !== false): ${activeGroups.length}`);
  console.log(`  С картинкой: ${withImage.length}`);
  console.log(`  БЕЗ картинки: ${needImage.length} ← НУЖНО СГЕНЕРИРОВАТЬ\n`);

  // By category
  console.log('=== ПО КАТЕГОРИЯМ (активные без картинок) ===\n');
  const byCategory: Record<string, typeof needImage> = {};
  needImage.forEach(g => {
    if (!byCategory[g.category]) byCategory[g.category] = [];
    byCategory[g.category].push(g);
  });

  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);
  for (const [cat, groups] of sortedCategories) {
    console.log(`${cat}: ${groups.length} картинок`);
    groups.slice(0, 3).forEach(g => console.log(`  - ${g.primary}`));
    if (groups.length > 3) console.log(`  ... и ещё ${groups.length - 3}`);
  }

  // List all scenes needing images
  console.log('\n=== ВСЕ СЦЕНЫ БЕЗ КАРТИНОК (активные) ===\n');
  needImage.forEach(g => {
    console.log(`[${g.category}] ${g.members.join(' + ')}`);
  });

  console.log(`\n=== ИТОГО: НУЖНО СГЕНЕРИРОВАТЬ ${needImage.length} УНИКАЛЬНЫХ КАРТИНОК ===`);
}

count();

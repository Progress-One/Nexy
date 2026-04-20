import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function sync() {
  // Get all paired onboarding scenes
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with, image_url, image_variants, accepted')
    .eq('category', 'onboarding')
    .neq('is_active', false)
    .not('paired_with', 'is', null)
    .order('slug');

  if (!data) {
    console.log('No paired scenes found');
    return;
  }

  const byId: Record<string, any> = {};
  data.forEach(s => byId[s.id] = s);

  // Track processed pairs to avoid duplicates
  const processed = new Set<string>();

  for (const scene of data) {
    if (processed.has(scene.id)) continue;

    const paired = byId[scene.paired_with];
    if (!paired) {
      console.log(`SKIP: ${scene.slug} - paired scene not found`);
      continue;
    }

    processed.add(scene.id);
    processed.add(paired.id);

    const v1 = scene.image_variants || [];
    const v2 = paired.image_variants || [];

    // If one has more variants, use that as the source
    // Or merge unique variants from both
    const mergedVariants = mergeVariants(v1, v2);

    // Use the accepted status from the primary (give/dom) scene
    const isPrimary = scene.slug.includes('-give') || scene.slug.includes('-dom-');
    const primaryScene = isPrimary ? scene : paired;
    const secondaryScene = isPrimary ? paired : scene;

    const acceptedStatus = primaryScene.accepted;

    console.log(`\nPAIR: ${primaryScene.slug} <-> ${secondaryScene.slug}`);
    console.log(`  Primary variants: ${(primaryScene.image_variants || []).length}`);
    console.log(`  Secondary variants: ${(secondaryScene.image_variants || []).length}`);
    console.log(`  Merged: ${mergedVariants.length}`);
    console.log(`  Accepted: ${acceptedStatus}`);

    // Update both scenes with merged variants and same accepted status
    const { error: err1 } = await supabase
      .from('scenes')
      .update({
        image_variants: mergedVariants,
        accepted: acceptedStatus
      })
      .eq('id', primaryScene.id);

    const { error: err2 } = await supabase
      .from('scenes')
      .update({
        image_variants: mergedVariants,
        accepted: acceptedStatus
      })
      .eq('id', secondaryScene.id);

    if (err1 || err2) {
      console.log(`  ERROR: ${err1?.message || err2?.message}`);
    } else {
      console.log(`  SYNCED!`);
    }
  }

  console.log('\n=== DONE ===');
}

function mergeVariants(v1: any[], v2: any[]): any[] {
  const urlSet = new Set<string>();
  const merged: any[] = [];

  // Helper to get base URL without query params
  const getBaseUrl = (url: string) => url?.split('?')[0] || '';

  for (const v of [...v1, ...v2]) {
    if (!v.url || v.is_placeholder) continue;
    const base = getBaseUrl(v.url);
    if (!urlSet.has(base)) {
      urlSet.add(base);
      merged.push(v);
    }
  }

  return merged;
}

sync();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface ImageVariant {
  url: string;
  prompt: string;
  created_at: string;
  qa_status?: 'passed' | 'failed' | null;
  is_placeholder?: boolean;
}

function getBaseUrl(url: string): string {
  return url?.split('?')[0] || '';
}

function mergeVariants(v1: ImageVariant[], v2: ImageVariant[]): ImageVariant[] {
  const urlSet = new Set<string>();
  const merged: ImageVariant[] = [];

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

async function sync() {
  // Get all worship-service scenes with paired_with
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, paired_with, image_variants, accepted')
    .eq('category', 'worship-service')
    .not('paired_with', 'is', null);

  if (!data) {
    console.log('No paired worship scenes found');
    return;
  }

  const byId: Record<string, any> = {};
  data.forEach(s => byId[s.id] = s);

  const processed = new Set<string>();

  for (const scene of data) {
    if (processed.has(scene.id)) continue;

    const paired = byId[scene.paired_with];
    if (!paired) continue;

    processed.add(scene.id);
    processed.add(paired.id);

    const v1 = scene.image_variants || [];
    const v2 = paired.image_variants || [];
    const merged = mergeVariants(v1, v2);

    // Use give scene's accepted status
    const isGive = scene.slug.includes('-give');
    const primary = isGive ? scene : paired;
    const secondary = isGive ? paired : scene;
    const acceptedStatus = primary.accepted;

    console.log(`\nPAIR: ${primary.slug} <-> ${secondary.slug}`);
    console.log(`  Primary variants: ${(primary.image_variants || []).length}`);
    console.log(`  Secondary variants: ${(secondary.image_variants || []).length}`);
    console.log(`  Merged: ${merged.length}`);
    console.log(`  Accepted: ${acceptedStatus}`);

    // Update both
    await supabase
      .from('scenes')
      .update({ image_variants: merged, accepted: acceptedStatus })
      .eq('id', primary.id);

    await supabase
      .from('scenes')
      .update({ image_variants: merged, accepted: acceptedStatus })
      .eq('id', secondary.id);

    console.log(`  SYNCED!`);
  }

  console.log('\n=== DONE ===');
}

sync();

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
  // Get all scenes with shared_images_with
  const { data } = await supabase
    .from('scenes')
    .select('id, slug, shared_images_with, image_variants, image_url, accepted')
    .not('shared_images_with', 'is', null);

  if (!data) {
    console.log('No linked scenes found');
    return;
  }

  const byId: Record<string, typeof data[0]> = {};
  data.forEach(s => byId[s.id] = s);

  const processed = new Set<string>();

  for (const scene of data) {
    if (processed.has(scene.id)) continue;

    const shared = byId[scene.shared_images_with!];
    if (!shared) continue;

    processed.add(scene.id);
    processed.add(shared.id);

    const v1 = scene.image_variants || [];
    const v2 = shared.image_variants || [];
    const merged = mergeVariants(v1, v2);

    // Use the scene that has more variants as primary for accepted status
    const primary = v1.length >= v2.length ? scene : shared;
    const acceptedStatus = primary.accepted;

    console.log(`\nPAIR: ${scene.slug} <-> ${shared.slug}`);
    console.log(`  Scene 1 variants: ${v1.length}`);
    console.log(`  Scene 2 variants: ${v2.length}`);
    console.log(`  Merged: ${merged.length}`);
    console.log(`  Accepted: ${acceptedStatus}`);

    // Update both
    await supabase
      .from('scenes')
      .update({ image_variants: merged, accepted: acceptedStatus })
      .eq('id', scene.id);

    await supabase
      .from('scenes')
      .update({ image_variants: merged, accepted: acceptedStatus })
      .eq('id', shared.id);

    console.log(`  SYNCED!`);
  }

  console.log('\n=== DONE ===');
}

sync();
